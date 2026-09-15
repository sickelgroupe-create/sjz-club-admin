// Presentation only: API authorization remains authoritative.
export const workspaces = [
  { title:'顾客', main:[['users','顾客信息','user']], more:[], hint:'对应小程序「我的」：查看顾客资料，直接查钱包或发优惠券。' },
  { title:'打手', main:[['players','打手资料','player'],['applications','入驻审核','application']], more:[], hint:'对应小程序「打手入驻 / 工作台」：先审核身份，再绑定商品；提现统一到资金管理。' },
  { title:'商品', main:[['products','商品列表','product'],['categories','商品分类','content']], more:[], hint:'在商品编辑里选择分类和负责打手，统一设置各服务规格的价格、库存和启停；无需再单独绑定服务。' },
  { title:'订单', main:[['orders','顾客订单','order'],['aftersales','退款售后','aftersale']], more:[['payments','支付对账','order'],['orderLogs','流转记录','order'],['paymentAudits','支付处理记录','order']], hint:'对应小程序「我的订单 / 打手工作台」：订单详情内查看支付、进度和结算，退款到售后处理。' },
  { title:'资金', main:[['wallets','用户钱包','wallet'],['withdrawals','提现打款','withdrawal'],['rechargeOrders','充值记录','wallet']], more:[['settlements','收益结算','wallet'],['receivables','退款追偿','receivable']], hint:'对应小程序钱包：顾客充值消费，打手提现收益；先实际打款，再确认提现。' },
  { title:'优惠券', main:[['coupons','优惠券','coupon'],['rechargeRules','充值赠券','coupon']], more:[['couponIssues','发放记录','coupon'],['rechargeRewards','赠券补发','coupon']], hint:'对应小程序「优惠券 / 充值中心」：可公开领券、给指定顾客发券，或充值成功后自动赠券。' },
  { title:'小程序设置', main:[['content','首页内容','content'],['homeEntries','首页入口','content'],['rechargeTiers','充值金额','finance-config'],['businessConfig','交易规则','finance-config'],['customerConfig','客服管理','customer-service']], more:[['messages','消息','content'],['reviews','评价','content'],['teenSettings','青少年限制与记录','teen-config'],['adminAudits','后台操作记录','audit']], hint:'首页入口选择客服、商品分类或打手列表，无需填写跳转代码；充值和交易规则单独设置。' }
]
export function normalizeEntity(entity) { return String(entity).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()) }
export function workspaceFor(entity) { return workspaces.find(g=>[...g.main,...g.more].some(t=>t[0]===normalizeEntity(entity))) }
export const sidebarNames = {users:'顾客管理',players:'打手管理',products:'商品管理',orders:'订单与售后',wallets:'资金管理',coupons:'优惠券'}
export const extraFields = {
  products:['detail_text'], coupons:['product_id'], players:['city','sort_no'],
  rechargeTiers:['sort_no'], users:['user_type']
}
export const compactColumns = {
  users:['id','nickname','phone','gender','status','created_at'],
  products:['image','name','category_code','bound_player_id','price','stock','is_hot','status'],
  orders:['order_no','user_id','contact_phone','product_name','total_amount','status','occupied_seconds','created_at'],
  players:['user_id','phone','image','display_name','gender','service_status','occupied_seconds','readiness','current_orders','available_balance','status'],
  applications:['real_name','phone','status','created_at'],
  withdrawals:['withdrawal_no','user_id','amount','status','created_at'],
  rechargeOrders:['recharge_no','nickname','amount','credited_amount','status','paid_at']
}
export function editLabel(entity) {
  return ({applications:'审核',withdrawals:'登记打款',orders:'推进订单',aftersales:'审核退款',rechargeRewards:'补发',receivables:'核销'})[entity] || '编辑'
}
export function canEditRow(entity,row) {
  if(entity==='aftersales')return ['provider_approved','provider_rejected','platform_reviewing'].includes(row.status)
  if(['applications','withdrawals'].includes(entity))return row.status==='pending'
  if(entity==='rechargeRewards')return row.status==='pending'
  return true
}

// Navigation-only copies: the registered routes and server permissions do not change.
export function groupClubMenus(routes, parent='') {
  const joined=(base,path)=>path.startsWith('/')?path:(base+'/'+path).replace(/\/+/g,'/');
  const retired=new Set(['shops','identities','playerServices','skus','follows','favorites','walletRecords']);
  const more=[];
  const result=routes.map(source=>{
    const route={...source,meta:{...source.meta}};
    if(source.children)route.children=groupClubMenus(source.children,joined(parent,source.path));
    if(source.component!=='club/manage/index')return route;
    const key=normalizeEntity(source.path.split('/').pop());
    if(retired.has(key))return {...route,hidden:true};
    const group=workspaceFor(key);
    if(group&&(group.title==='小程序设置'||group.more.some(t=>t[0]===key))) {
      more.push({...route,path:joined(parent,source.path),hidden:false,meta:{...route.meta,clubMore:true}});
      return null;
    }
    return route;
  }).filter(Boolean);
  if(more.length)result.push({path:'more-management',component:'ParentView',alwaysShow:true,meta:{title:'更多管理',icon:'system'},children:more});
  return result;
}
