# upload/views.py
import logging
import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .models import FileUpload
from .serializers import FileUploadSerializer

logger = logging.getLogger(__name__)

class FileUploadInitView(APIView):
    def post(self, request):
        try:
            # Log incoming request data
            logger.debug(f"Received upload init request: {request.data}")
            
            required_fields = ['filename', 'filesize', 'total_chunks']
            for field in required_fields:
                if field not in request.data:
                    logger.error(f"Missing required field: {field}")
                    return Response(
                        {'error': f'Missing required field: {field}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )

            data = {
                'file_name': request.data['filename'],
                'file_size': request.data['filesize'],
                'total_chunks': request.data['total_chunks'],
                'upload_status': 'pending',
                'chunks_received': 0
            }

            serializer = FileUploadSerializer(data=data)
            if not serializer.is_valid():
                logger.error(f"Serializer errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            upload = serializer.save()
            
            # Create upload directory
            upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads', str(upload.id))
            os.makedirs(upload_dir, exist_ok=True)
            
            response_data = {
                'file_id': upload.id,
                'status': 'initialized',
                'message': 'Upload initialized successfully'
            }
            logger.info(f"Upload initialized: {response_data}")
            return Response(response_data)
            
        except Exception as e:
            logger.exception("Error in FileUploadInitView")
            return Response(
                {'error': f'Upload initialization failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class ChunkUploadView(APIView):
    def post(self, request):
        try:
            chunk_number = int(request.data['chunk_number'])
            file_id = request.data['file_id']
            chunk_data = request.FILES['chunk']
            
            upload = FileUpload.objects.get(id=file_id)
            upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads', str(file_id))
            os.makedirs(upload_dir, exist_ok=True)
            
            # Save chunk with better error handling
            chunk_path = os.path.join(upload_dir, f'chunk_{chunk_number}')
            try:
                with open(chunk_path, 'wb+') as destination:
                    for chunk in chunk_data.chunks():
                        destination.write(chunk)
            except IOError as e:
                return Response({
                    'error': f'Failed to save chunk: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Update progress
            upload.chunks_received += 1
            upload.save()

            # Check if all chunks are received
            if upload.chunks_received == upload.total_chunks:
                try:
                    # Combine chunks in a separate thread
                    self.combine_chunks_async(upload, upload_dir)
                    return Response({
                        'status': 'success',
                        'progress': 100,
                        'upload_status': 'combining',
                        'message': 'Combining chunks...'
                    })
                except Exception as e:
                    return Response({
                        'error': f'Failed to combine chunks: {str(e)}'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Return progress
            progress = (upload.chunks_received / upload.total_chunks) * 100
            return Response({
                'status': 'success',
                'progress': progress,
                'upload_status': 'uploading',
                'chunks_received': upload.chunks_received,
                'total_chunks': upload.total_chunks
            })
            
        except FileUpload.DoesNotExist:
            return Response({
                'error': 'File upload not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    def combine_chunks_async(self, upload, upload_dir):
        import threading
        thread = threading.Thread(
            target=self._combine_chunks,
            args=(upload, upload_dir)
        )
        thread.start()

    def _combine_chunks(self, upload, upload_dir):
        try:
            final_path = os.path.join(upload_dir, upload.file_name)
            with open(final_path, 'wb+') as destination:
                for i in range(upload.total_chunks):
                    chunk_path = os.path.join(upload_dir, f'chunk_{i}')
                    if not os.path.exists(chunk_path):
                        continue
                    with open(chunk_path, 'rb') as source:
                        while True:
                            data = source.read(8 * 1024 * 1024)  # Read 8MB at a time
                            if not data:
                                break
                            destination.write(data)
                    os.remove(chunk_path)  # Remove chunk after combining

            upload.file_path = os.path.join('uploads', str(upload.id), upload.file_name)
            upload.upload_status = 'completed'
            upload.save()
        except Exception as e:
            upload.upload_status = 'error'
            upload.save()
            raise e
class UploadStatusView(APIView):
    def get(self, request, file_id):
        try:
            upload = FileUpload.objects.get(id=file_id)
            return Response({
                'status': upload.upload_status,
                'progress': (upload.chunks_received / upload.total_chunks) * 100
            })
        except FileUpload.DoesNotExist:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
class CleanupUploadView(APIView):
    def post(self, request, file_id):
        try:
            upload = FileUpload.objects.get(id=file_id)
            upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads', str(file_id))
            
            if os.path.exists(upload_dir):
                import shutil
                shutil.rmtree(upload_dir)
            
            upload.delete()
            return Response({
                'status': 'success',
                'message': 'Upload cleaned up successfully'
            })
        except FileUpload.DoesNotExist:
            return Response({
                'error': 'Upload not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception("Error in CleanupUploadView")
            return Response({
                'error': f'Cleanup failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)