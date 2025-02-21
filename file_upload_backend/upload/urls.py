from django.urls import path
from .views import FileUploadInitView, ChunkUploadView, UploadStatusView

urlpatterns = [
    path('init/', FileUploadInitView.as_view(), name='upload-init'),
    path('chunk/', ChunkUploadView.as_view(), name='chunk-upload'),
    path('status/<int:file_id>/', UploadStatusView.as_view(), name='upload-status'),
]