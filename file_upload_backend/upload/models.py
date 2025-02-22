from django.db import models

class FileUpload(models.Model):
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField()
    file_path = models.CharField(max_length=255, null=True, blank=True)
    total_chunks = models.IntegerField()
    chunks_received = models.IntegerField(default=0)
    upload_status = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'file_uploads'