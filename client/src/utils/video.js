export const getVideoThumbnailUrl = (videoUrl) => {
  if (!videoUrl || typeof videoUrl !== 'string') return null
  if (!videoUrl.includes('cloudinary')) return null

  const transformedUrl = videoUrl.replace(
    '/upload/',
    '/upload/so_1,w_960,h_540,c_fill,f_jpg/'
  )

  return transformedUrl.replace(/\.(mp4|mov|webm|m4v)(\?.*)?$/i, '.jpg$2')
}
