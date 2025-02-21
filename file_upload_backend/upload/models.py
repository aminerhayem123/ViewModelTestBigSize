from django.db import models
from django.utils import timezone

class FileUpload(models.Model):
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField()
    file_path = models.CharField(max_length=255, null=True, blank=True)
    total_chunks = models.IntegerField()
    chunks_received = models.IntegerField(default=0)
    upload_status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # Add this field

    def save(self, *args, **kwargs):
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        return super().save(*args, **kwargs)

    class Meta:
        ordering = ['-created_at']