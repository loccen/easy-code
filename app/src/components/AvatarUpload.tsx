'use client';

import { useState, useRef } from 'react';
import { authService } from '@/lib/services/auth.service';
import { Avatar, Button } from '@/components/ui';
import { useAuth, useAuthStore } from '@/stores/authStore';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onUploadSuccess?: (url: string) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function AvatarUpload({ 
  currentAvatarUrl, 
  onUploadSuccess,
  size = 'xl' 
}: AvatarUploadProps) {
  const { user } = useAuth();
  const { refreshUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过5MB');
      return;
    }

    try {
      setUploading(true);
      setError('');

      // 使用认证服务上传头像
      const result = await authService.uploadAvatar(file);

      if (!result.success) {
        throw new Error(result.error?.message || '上传失败');
      }

      // 刷新用户信息
      await refreshUser();

      // 调用成功回调
      onUploadSuccess?.(result.data.avatar_url);

      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      console.error('上传头像失败:', err);
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !currentAvatarUrl) return;

    try {
      setUploading(true);
      setError('');

      // 更新用户资料，移除头像URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          avatar_url: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (updateError) throw updateError;

      // 删除存储中的头像文件（如果是上传的文件）
      if (currentAvatarUrl.includes('user-uploads/avatars/')) {
        const filePath = currentAvatarUrl.split('/').slice(-2).join('/');
        await supabase.storage
          .from('user-uploads')
          .remove([filePath]);
      }

      // 刷新用户信息
      await refreshUser();
      
      // 调用成功回调
      onUploadSuccess?.('');

    } catch (err) {
      console.error('删除头像失败:', err);
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* 头像显示 */}
      <Avatar
        src={currentAvatarUrl}
        alt={user?.username}
        size={size}
        fallback={user?.username}
        className="border-4 border-white shadow-lg"
      />

      {/* 错误信息 */}
      {error && (
        <div className="text-sm text-red-600 text-center">
          {error}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleFileSelect}
          disabled={uploading}
          loading={uploading}
        >
          {currentAvatarUrl ? '更换头像' : '上传头像'}
        </Button>
        
        {currentAvatarUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={uploading}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            删除头像
          </Button>
        )}
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 上传提示 */}
      <div className="text-xs text-gray-500 text-center max-w-xs">
        支持 JPG、PNG、GIF 格式，文件大小不超过 5MB
      </div>
    </div>
  );
}
