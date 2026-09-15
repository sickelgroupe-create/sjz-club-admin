export const homeTargetOptions=[{label:'在线客服',value:'service'},{label:'指定商品分类',value:'category'},{label:'全部商品',value:'products'},{label:'打手列表',value:'players'}]
export function homeTargetFields(url) {
  const [path,query='']=String(url||'').split('?')
  if(path==='/pages/service/customer')return {target_kind:'service',target_category:''}
  if(path==='/pages/players/index'&&!query)return {target_kind:'players',target_category:''}
  if(path==='/pages/product/list'){
    const category=new URLSearchParams(query).get('category')||''
    return {target_kind:category?'category':'products',target_category:category}
  }
  return {target_kind:'preserve',target_category:''}
}
export function homeTargetLabel(url,categories=[]) {
  const t=homeTargetFields(url)
  if(t.target_kind==='category')return '商品分类：'+(categories.find(c=>c.code===t.target_category)?.name||'待确认分类')
  return homeTargetOptions.find(o=>o.value===t.target_kind)?.label||'原有页面（保留）'
}
