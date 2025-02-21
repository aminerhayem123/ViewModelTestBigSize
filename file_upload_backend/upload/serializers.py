from rest_framework import serializers
from .models import FileUpload

class FileUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileUpload
        fields = ['id', 'file_name', 'file_size', 'file_path', 'total_chunks', 
                 'chunks_received', 'upload_status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']