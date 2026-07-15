# 客户相册媒体目录

需要随源码长期交付的宝宝照片，请按相册编号建立目录，例如：

`public/albums/demo-album-001/`

浏览器编辑台中的上传文件属于本地临时素材；最终使用 `npm run export:package -- album.json` 将三级媒体写入交付 ZIP。配置中不要保存 Windows 绝对路径。
