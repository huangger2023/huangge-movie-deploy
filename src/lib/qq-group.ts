/**
 * QQ 群配置
 * 直播 / 站点引流加群信息，统一在这里维护
 */
export const QQ_GROUP = {
  /** QQ 群名称 */
  name: "荒哥和他的伙伴们（演示2群）",
  /** QQ 群号（用于复制 / 展示） */
  number: "1079125758",
  /** 一键加群链接（点击直接拉起 QQ 加群 / 网页加群） */
  joinUrl: "https://qm.qq.com/q/yVTxXtYzcY",
  /**
   * 二维码图片（可选）
   * 直播观众用手机扫码加群最方便。
   * 把图片放到 /public/qq-group-qr.png 即可自动展示，
   * 不存在时不会出现"图片裂开"，组件会自动隐藏二维码区块。
   */
  qrcode: "/qq-group-qr.png",
  /** 简短宣传语 */
  tagline: "直播间专属学习群 · 实战答疑 · 同行交流",
};
