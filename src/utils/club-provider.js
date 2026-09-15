export function providerLabel(value) {
  return ({ platform: '平台承接', player: '指定打手', merchant: '历史商家订单' })[value] || value || '-'
}
