from django.urls import path
from .views import FileUploadInitView, ChunkUploadView, UploadStatusView, CleanupUploadView

urlpatterns = [
    path('upload/init/', FileUploadInitView.as_view(), name='upload-init'),
    path('upload/chunk/', ChunkUploadView.as_view(), name='upload-chunk'),
    path('upload/status/<int:file_id>/', UploadStatusView.as_view(), name='upload-status'),
    path('upload/cleanup/<int:file_id>/', CleanupUploadView.as_view(), name='upload-cleanup'),
]