export function specificationError(rows){
  if(!Array.isArray(rows)||!rows.length||rows.length>100)return '请设置1至100个服务规格'
  for(const row of rows){
    if(!String(row.name||'').trim())return '请填写每个服务规格的名称'
    if(!Number.isFinite(Number(row.price))||Number(row.price)<=0||Number(row.price)>99999999.99||Math.abs(Number(row.price)*100-Math.round(Number(row.price)*100))>0.00001)return '规格价格必须大于0且最多两位小数'
    if(!Number.isInteger(row.stock)||row.stock<0||row.stock>2147483647)return '可售数量必须为非负整数'
    if(!['active','inactive'].includes(row.status))return '请选择规格启停状态'
  }
  if(rows.filter(r=>r.status==='active').reduce((sum,r)=>sum+r.stock,0)>2147483647)return '商品总库存过大'
  return ''
}
