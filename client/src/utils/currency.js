export const formatXaf = (value) => {
  const amount = Number(value || 0)
  return `${amount.toLocaleString('en-US')} XAF`
}

const RENTAL_PERIOD_LABEL = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year'
}

export const formatXafByRentalType = (value, rentalType = 'monthly') => {
  const period = RENTAL_PERIOD_LABEL[rentalType] || RENTAL_PERIOD_LABEL.monthly
  return `${formatXaf(value)} / ${period}`
}

export const formatPropertyPrice = (property) => {
  if (!property) return formatXafByRentalType(0, 'monthly')
  const rentalType = property.rentalType || 'monthly'
  const pricingValue = Number(property?.pricing?.[rentalType] || 0)
  const fallbackValue = Number(property.price || 0)
  return formatXafByRentalType(pricingValue > 0 ? pricingValue : fallbackValue, rentalType)
}

export const formatXafPerMonth = (value) => formatXafByRentalType(value, 'monthly')
