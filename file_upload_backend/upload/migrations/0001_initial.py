# Generated by Django 5.0.2 on 2025-02-21 15:41

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='FileUpload',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file_name', models.CharField(max_length=255)),
                ('file_size', models.IntegerField()),
                ('file_path', models.CharField(blank=True, max_length=255, null=True)),
                ('total_chunks', models.IntegerField()),
                ('chunks_received', models.IntegerField(default=0)),
                ('upload_status', models.CharField(default='pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
