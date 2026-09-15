export function formatTime(value) {
  return value ? String(value).replace('T', ' ').replace(/\.\d+$/, '').slice(0, 19) : '未填写'
}
export const stateLabels = {unpaid:'待付款',pending:'待处理',accepted:'已接单',serving:'服务中',completed:'已完成',cancelled:'已关闭',refunding:'退款中',refunded:'已退款',deleted:'已删除',active:'正常',inactive:'停用',disabled:'停用',busy:'接单中，暂时无法服务',online:'在线接单',paused:'暂停接单',offline:'离线',success:'成功',failed:'失败',approved:'已通过',rejected:'已驳回',created:'已创建',male:'男',female:'女',unknown:'未设置',wechat:'微信支付',mock_wechat:'历史支付',balance:'钱包余额支付',platform:'平台承接',merchant:'商家',player:'打手',public:'公开领取',targeted:'定向发放',recharge:'充值赠券',issued:'已发放',user:'顾客',system:'系统',admin:'管理员',settled:'已结算',reversed:'已冲正',protected:'冻结保护中'}
export const orderTransitions = {unpaid:['cancelled'],pending:['accepted','serving'],accepted:['serving'],serving:['completed']}
export function targetsFor(status) {return (orderTransitions[status] || []).map(value=>({value,label:stateLabels[value]}))}
export function dashboardTarget(key) {
  const targets={users:['users',''],products:['products','active'],orders:['orders',''],paidOrders:['orders','paid'],pendingApplications:['players','pending'],pendingIdentities:['applications','pending'],pendingWithdrawals:['withdrawals','pending'],paidRevenue:['orders','paid']}
  if(key==='pendingApplications')return {path:'/club/players',query:{entity:'applications',status:'pending'}};
  const target=targets[key];return target?{path:'/club/'+target[0],query:target[1]?{status:target[1]}:{}}:null
}
export const detailFields = {
  orders:{user_id:'顾客ID',nickname:'顾客昵称',shop_name:'店铺',sku_name:'商品规格',quantity:'购买数量',unit_price:'单价',original_amount:'商品原价合计',discount_amount:'优惠金额',contact_name:'联系人',contact_phone:'联系电话',game_id:'游戏ID',game_nickname:'游戏昵称',remark:'订单备注',player_name:'指定陪玩',paid_at:'支付时间',cancel_reason:'关闭原因',cancelled_at:'关闭时间',completed_at:'完成时间'},
  identities:{userId:'用户ID',realName:'真实姓名',idNumber:'身份证号',status:'审核状态',reviewNote:'审核意见',submittedAt:'提交时间',reviewedAt:'审核时间'},
  applications:{application_type:'申请类型',real_name:'联系人',phone:'联系电话',game_id:'游戏ID',game_nickname:'游戏昵称',intro:'申请说明',status:'审核状态',review_note:'审核意见',created_at:'申请时间',reviewed_at:'审核时间',agreement_version:'协议版本',agreed_at:'同意时间'}
}
export const orderSections = [
  ['logs','订单流转',{from_status:'原状态',to_status:'当前状态',operator_type:'操作方',note:'说明',created_at:'时间'}],
  ['payments','支付记录',{payment_no:'支付单号',pay_method:'支付方式',amount:'金额',status:'状态',mock_transaction_no:'支付流水号',created_at:'时间'}],
  ['paymentAudits','支付处理记录',{action:'操作',result_status:'结果',detail:'说明',created_at:'时间'}],
  ['coupon','优惠券',{name:'优惠券',discount_amount:'优惠金额',status:'状态'}],
  ['walletRecords','钱包流水',{user_id:'用户',description:'说明',amount:'变动金额',balance_before:'变动前余额',balance_after:'变动后余额',created_at:'时间'}],
  ['settlement','结算记录',{settlement_no:'结算号',gross_amount:'实付金额',platform_fee:'平台金额',provider_income:'服务收益',status:'状态'}],
  ['aftersales','售后记录',{aftersale_no:'售后单号',reason:'原因',refund_amount:'退款金额',status:'状态',applied_at:'申请时间'}]
]
