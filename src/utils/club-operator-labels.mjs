const options=items=>Object.entries(items).map(([value,label])=>({value,label}))
export const periodOptions=options({all:'累计',month:'本月',week:'本周',day:'今日'})
export const contentOptions=options({product:'商品及打手资料',news:'资讯',announcement:'公告',promotion:'活动',document:'协议文档',ranking:'排行榜'})
export const sceneOptions=options({startup:'启动公告',homeBanners:'首页轮播图',newsCards:'首页资讯',filing:'备案资质',privacy:'隐私政策',agreement:'用户协议',about:'关于我们'})
export const homeRoleOptions=options({all:'全部',user:'顾客',player:'打手'})
const config=(label,help,type='number',unit='',min=0,max=100000)=>({label,help,type,unit,min,max})
export const businessSettings={
 platform_commission_rate:config('平台佣金比例','每笔完成订单从实付金额中扣除的比例，剩余部分计入打手收益。','number','%',0,100),
 auto_complete_hours:config('订单自动确认时限','打手标记服务完成后，顾客未确认时等待多久自动完成订单。','number','小时',1,720),
 recharge_enabled:config('顾客充值开关','开启后顾客可使用真实微信支付充值。','switch'),
 ranking_enabled:config('消费排行榜','是否在小程序展示消费排行榜。','switch'),
 ranking_mask_nickname:config('排行榜昵称保护','开启后隐藏昵称中的部分文字。','switch'),
 ranking_period:{...config('排行榜统计周期','选择排行榜统计的时间范围。','select'),options:periodOptions},
 ranking_limit:config('排行榜人数','排行榜最多展示多少位顾客。','number','人',1,100),
 aftersale_protection_hours:config('售后保护时长','订单完成后保留申请售后的时间。','number','小时',0,2160),
 aftersale_provider_response_hours:config('打手售后处理时限','打手处理售后申请的最长等待时间。','number','小时',0,2160),
 teen_block_order:config('青少年模式禁止下单','开启后，启用青少年模式的账号不能下单。','switch'),
 teen_block_recharge:config('青少年模式禁止充值','开启后，启用青少年模式的账号不能充值。','switch'),
 teen_block_balance_payment:config('青少年模式禁止余额支付','开启后，启用青少年模式的账号不能使用余额付款。','switch'),
 teen_block_withdrawal:config('青少年模式禁止提现','开启后，启用青少年模式的账号不能申请提现。','switch'),
 teen_single_spend_limit:config('青少年单次消费上限','启用青少年模式的账号每笔订单可消费的最高金额。','number','元'),
 teen_daily_spend_limit:config('青少年每日消费上限','启用青少年模式的账号每天累计可消费的最高金额。','number','元'),
 teen_allowed_start:config('青少年可用时间：开始','每日允许使用的开始时间。','time'),
 teen_allowed_end:config('青少年可用时间：结束','每日允许使用的结束时间。','time'),
 teen_content_scope:{...config('青少年可见内容','选择青少年模式下允许浏览的内容。','multi'),options:contentOptions}
}
export const businessMeta=key=>businessSettings[key]||config('其他设置','此项由平台维护，请联系管理员。','readonly')
export function businessValue(key,value){const m=businessMeta(key);if(key.startsWith('teen_')&&key.endsWith('spend_limit')&&Number(value)===0)return '不限额（仍受禁止消费开关限制）';if(m.type==='switch')return String(value)==='1'?'开启':'关闭';if(m.options)return String(value).split(',').map(v=>m.options.find(o=>o.value===v)?.label||'未配置').join('、');return `${value??'未设置'}${m.unit||''}`}
const labels={register:'注册赠送',admin:'后台发放',claim:'顾客领取',public:'公开领取',targeted:'指定发放',recharge:'充值赠送',article:'资讯',document:'文档',promotion:'活动',startup:'启动公告',homeBanners:'首页轮播图',newsCards:'首页资讯',filing:'备案资质',privacy:'隐私政策',agreement:'用户协议',about:'关于我们',all:'全部',user:'顾客',player:'打手',merchant:'历史商家',system:'系统',order:'订单',service:'服务',anchor:'陪玩服务',space:'游戏服务',uncategorized:'未分类'}
const auditLabels={wechat_notify:'微信支付结果通知',wechat_prepay:'发起微信支付',wechat_query:'查询微信支付结果',balance_pay:'余额付款',wechat_refund:'发起微信退款',refund_notify:'微信退款结果通知',wechat_refund_notify:'微信退款结果通知',mock_wechat:'历史联调记录',mock_wechat_pay:'历史联调记录',create:'新增',update:'修改',delete:'删除或停用',view_sensitive:'查看审核材料',review:'审核',disable:'停用',edit:'修改',detail:'查看详情',list:'查看列表',players:'打手资料',products:'商品',shops:'历史店铺资料',applications:'入驻审核',identities:'身份材料',coupons:'优惠券',couponIssues:'优惠券发放',businessConfig:'交易与使用规则',homeEntries:'首页入口',content:'首页内容',customerConfig:'客服设置',withdrawals:'提现',orders:'订单',wallets:'钱包',user:'顾客',player:'打手',product:'商品',application:'入驻审核',identity:'身份材料',coupon:'优惠券','finance-config':'交易规则','customer-service':'客服设置',audit:'后台操作记录',role:'账号角色'}
export function operatorLabel(value){if(String(value).startsWith('club:'))return String(value).slice(5).split(':').map(v=>auditLabels[v]||labels[v]||'其他').join('：');return auditLabels[value]||labels[value]||(/^[a-z][a-z0-9_-]*$/i.test(String(value))?'其他':value)}
export function couponWindow(c,now=Date.now()){const parse=v=>new Date(String(v||'').replace(' ','T')).getTime();const start=parse(c.valid_from),end=parse(c.valid_until);if(!Number.isFinite(start)||!Number.isFinite(end))return '请设置有效期';if(now<start)return '未生效';if(now>end)return '已过期';return '有效期内'}
export const localDateTime=d=>new Date(d-new Date(d).getTimezoneOffset()*60000).toISOString().slice(0,19).replace('T',' ')
