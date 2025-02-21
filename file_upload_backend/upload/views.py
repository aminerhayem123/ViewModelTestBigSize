# upload/views.py
from rest_framework.views import APIView # type: ignore
from rest_framework.response import Response # type: ignore
from rest_framework import status # type: ignore
from django.conf import settings # type: ignore
import os
from .models import FileUpload
from .serializers import FileUploadSerializer

class FileUploadInitView(APIView):
    def post(self, request):
        try:
            data = {
                'file_name': request.data['filename'],
                'file_size': request.data['filesize'],
                'total_chunks': request.data['total_chunks'],
                'upload_status': 'pending',
                'chunks_received': 0
            }
            serializer = FileUploadSerializer(data=data)
            if serializer.is_valid():
                upload = serializer.save()
                return Response({
                    'file_id': upload.id,
                    'status': 'initialized'
                })
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
# upload/views.py
class ChunkUploadView(APIView):
    def post(self, request):
        try:
            chunk_number = int(request.data['chunk_number'])
            file_id = request.data['file_id']
            chunk_data = request.FILES['chunk']
            
            upload = FileUpload.objects.get(id=file_id)
            
            # Create directory if it doesn't exist
            upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads', str(file_id))
            os.makedirs(upload_dir, exist_ok=True)
            
            # Save chunk
            chunk_path = os.path.join(upload_dir, f'chunk_{chunk_number}')
            with open(chunk_path, 'wb+') as destination:
                for chunk in chunk_data.chunks():
                    destination.write(chunk)
            
            # Update progress
            upload.chunks_received += 1
            if upload.chunks_received == upload.total_chunks:
                upload.upload_status = 'combining'
                upload.save()
                
                # Combine chunks
                final_path = os.path.join(upload_dir, upload.file_name)
                with open(final_path, 'wb+') as destination:
                    for i in range(upload.total_chunks):
                        chunk_path = os.path.join(upload_dir, f'chunk_{i}')
                        with open(chunk_path, 'rb') as source:
                            destination.write(source.read())
                        os.remove(chunk_path)
                
                upload.file_path = os.path.join('uploads', str(file_id), upload.file_name)
                upload.upload_status = 'completed'
                upload.save()
                
                # Return completed response with file path
                return Response({
                    'status': 'success',
                    'progress': 100,
                    'upload_status': 'completed',
                    'file_path': upload.file_path
                })
            
            upload.save()
            
            # Return progress response
            return Response({
                'status': 'success',
                'progress': (upload.chunks_received / upload.total_chunks) * 100,
                'upload_status': upload.upload_status
            })
            
        except FileUpload.DoesNotExist:
            return Response({'error': 'File upload not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
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