// Mini-program bundled images live on the customer site, not the admin/API site.
export function clubAssetUrl(value, apiBase='/prod-api', customerOrigin='https://sjz.oksja.cn') {
  const url=String(value||'')
  if (!url || /^(https?:|data:|blob:)/i.test(url)) return url
  if (url.startsWith('/static/')) return customerOrigin.replace(/\/$/,'')+url
  if (url.startsWith('/profile/')) return apiBase.replace(/\/$/,'')+url
  return url
}
export function imageStoredValue(file, apiBase='/prod-api') {
  if (file.rawUrl !== undefined) return file.rawUrl
  const url=String(file.url||'')
  return url.startsWith(apiBase+'/') ? url.slice(apiBase.length) : url
}
