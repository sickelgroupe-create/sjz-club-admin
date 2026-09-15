export const aftersaleStatus = value => ({applied:'待打手处理',provider_approved:'打手同意，待平台审核',provider_rejected:'打手拒绝，待平台审核',platform_reviewing:'平台审核中',approved:'平台已通过，等待退款结果',refunded:'退款已完成',rejected:'平台已驳回'})[value] || '状态待核实'
export const refundActor = value => ({user:'顾客',provider:'打手',player:'打手',admin:'管理员',system:'系统',wechat:'微信支付'})[value] || '处理方待核实'
export function refundSummary(row) {
  const payments=Array.isArray(row.refundPayments)?row.refundPayments:[]
  const p=payments.length===1?payments[0]:null
  if(!p)return {channel:'支付渠道待核实',state:'暂无支付渠道结果',notice:'请核对支付处理记录，不能仅凭平台审核通过判断退款到账。'}
  const channel=({wechat:'微信支付，退回原付款账户',balance:'小程序钱包余额'})[p.mode] || '支付渠道待核实'
  const state=p.mode==='wechat'?({success:'微信已确认退款成功',processing:'微信退款处理中',closed:'微信退款已关闭',abnormal:'微信退款异常，需人工核查'})[p.refund_status] || '尚无微信退款结果':p.mode==='balance'&&p.status==='refunded'?'已退回小程序钱包余额':'尚无退款成功记录'
  const notice=p.mode==='wechat'?'微信付款原路退款，不增加小程序钱包余额。请在付款微信的账单中查看退款及入账账户。':p.mode==='balance'?'余额支付的退款退回小程序钱包，可在钱包流水中核对。':'请先核实原支付渠道。'
  return {channel,state,notice}
}
