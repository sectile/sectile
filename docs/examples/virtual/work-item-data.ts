export type WorkItemPriority = 'critical' | 'high' | 'medium' | 'low'
export type WorkItemState = 'investigating' | 'monitoring' | 'resolved'

export interface WorkItemRecord {
  readonly id: string
  readonly number: string
  readonly title: string
  readonly summary: string
  readonly priority: WorkItemPriority
  readonly state: WorkItemState
  readonly service: string
  readonly owner: string
  readonly region: string
  readonly tags: readonly string[]
  readonly affected: number
  readonly ageMinutes: number
  readonly activity: readonly string[]
}

const catalogs = {
  ko: {
    services: ['결제', '배송', '환불', '회원 정보', '상품', '판매자 문의'],
    regions: ['웹 문의', '전화', '채팅', '이메일'],
    owners: ['고객 지원 1팀', '고객 지원 2팀', '결제 운영팀', '배송 운영팀', '판매자 지원팀'],
    titles: [
      '결제는 끝났는데 주문 내역이 보이지 않아요',
      '배송지를 바꿨는데 이전 주소로 발송됐어요',
      '반품을 접수한 뒤 처리 상태가 바뀌지 않아요',
      '할인 쿠폰이 적용되지 않은 채 결제됐어요',
      '본인 인증을 마쳤는데 로그인이 되지 않아요',
      '판매자 답변을 받은 뒤 추가 문의가 생겼어요',
    ],
    summaries: [
      '주문 정보와 결제 기록을 확인한 뒤 고객에게 안내할 내용을 정리하고 있습니다.',
      '관련 부서에 확인을 요청했습니다. 답변이 들어오는 대로 처리 내역에 자동으로 덧붙입니다.',
      '고객이 남긴 내용과 이전 상담 기록을 함께 살펴보고 있습니다.',
    ],
    activities: [
      '고객이 남긴 문의 내용을 확인했습니다',
      '관련 주문과 결제 기록을 조회했습니다',
      '담당 부서에 확인을 요청했습니다',
      '고객에게 처리 결과를 안내했습니다',
      '새 답변이 처리 내역에 추가됐습니다',
    ],
    tags: ['결제', '배송', '고객 답변', '확인 필요', '우선 처리', '판매자 문의'],
  },
  en: {
    services: ['Payments', 'Delivery', 'Returns', 'Accounts', 'Catalog', 'Seller support'],
    regions: ['Web', 'Phone', 'Chat', 'Email'],
    owners: ['Customer care 1', 'Customer care 2', 'Payments operations', 'Delivery operations', 'Seller support'],
    titles: [
      'My payment completed but the order is missing',
      'The parcel was sent to my previous address',
      'My return status has not changed',
      'The discount was not applied at checkout',
      'I completed verification but cannot sign in',
      'I have a follow-up question for the seller',
    ],
    summaries: [
      'The team is reviewing the order and payment history before responding to the customer.',
      'A related team has been asked to investigate. New replies will appear in the activity history.',
      'The original request and previous support history are being reviewed together.',
    ],
    activities: [
      'Reviewed the customer request',
      'Checked the related order and payment history',
      'Asked the owning team to investigate',
      'Sent the resolution to the customer',
      'Added a new reply to the activity history',
    ],
    tags: ['payment', 'delivery', 'customer reply', 'needs review', 'priority', 'seller'],
  },
} as const

export function workItemHash(id: string): number {
  let value = 2_166_136_261
  for (let index = 0; index < id.length; index += 1) {
    value ^= id.charCodeAt(index)
    value = Math.imul(value, 16_777_619)
  }
  return value >>> 0
}

export function workItemRecord(id: string, korean = false): WorkItemRecord {
  const hash = workItemHash(id)
  const catalog = korean ? catalogs.ko : catalogs.en
  const priority = (['critical', 'high', 'medium', 'low'] as const)[hash % 4]!
  const state = (['investigating', 'monitoring', 'resolved'] as const)[Math.floor(hash / 5) % 3]!
  const tagCount = 1 + Math.floor(hash / 19) % 3
  return Object.freeze({
    id,
    number: id.replace('request-', 'REQ-'),
    title: catalog.titles[Math.floor(hash / 7) % catalog.titles.length]!,
    summary: catalog.summaries[Math.floor(hash / 11) % catalog.summaries.length]!,
    priority,
    state,
    service: catalog.services[Math.floor(hash / 13) % catalog.services.length]!,
    owner: catalog.owners[Math.floor(hash / 17) % catalog.owners.length]!,
    region: catalog.regions[Math.floor(hash / 23) % catalog.regions.length]!,
    tags: Object.freeze(Array.from({ length: tagCount }, (_, index) => catalog.tags[(hash + index * 3) % catalog.tags.length]!)),
    affected: 12 + hash % 8_900,
    ageMinutes: 1 + Math.floor(hash / 29) % 780,
    activity: Object.freeze(Array.from({ length: 3 }, (_, index) => catalog.activities[(hash + index * 7) % catalog.activities.length]!)),
  })
}
