import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.DISEASE_API_KEY || process.env.DATA_GO_KR_API_KEY
const BASE_URL = 'https://apis.data.go.kr/1790387/EIDAPIService'

// 기간별 감염병 발생 현황 (기본)
async function getPeriodStats(year: string) {
  const url = `${BASE_URL}/PeriodBasic?serviceKey=${API_KEY}&resType=2&searchYear=${year}&numOfRows=100&pageNo=1`
  
  console.log('PeriodBasic URL:', url)
  
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } })
    const text = await response.text()
    console.log('PeriodBasic response:', text.substring(0, 500))
    
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  } catch (error) {
    console.error('getPeriodStats error:', error)
    return null
  }
}

// 지역별 감염병 발생 현황
async function getRegionStats(year: string) {
  const url = `${BASE_URL}/Region?serviceKey=${API_KEY}&resType=2&searchType=1&searchYear=${year}&numOfRows=100&pageNo=1`
  
  console.log('Region URL:', url)
  
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } })
    const text = await response.text()
    console.log('Region response:', text.substring(0, 500))
    
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  } catch (error) {
    console.error('getRegionStats error:', error)
    return null
  }
}

// 감염병별 발생 현황
async function getDiseaseStats(year: string) {
  const url = `${BASE_URL}/Disease?serviceKey=${API_KEY}&resType=2&searchType=1&searchYear=${year}&patntType=1&numOfRows=100&pageNo=1`
  
  console.log('Disease URL:', url)
  
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } })
    const text = await response.text()
    console.log('Disease response:', text.substring(0, 500))
    
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  } catch (error) {
    console.error('getDiseaseStats error:', error)
    return null
  }
}

// 감염병별 사망 현황
async function getDeathStats(year: string) {
  const url = `${BASE_URL}/death?serviceKey=${API_KEY}&resType=2&searchYear=${year}&numOfRows=100&pageNo=1`
  
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } })
    const text = await response.text()
    
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  } catch (error) {
    console.error('getDeathStats error:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'all'
  
  // 2024년 데이터 사용 (2025/2026년 데이터는 아직 없을 수 있음)
  const currentYear = '2024'
  
  try {
    if (type === 'period') {
      const data = await getPeriodStats(currentYear)
      return NextResponse.json({ success: true, data })
    }
    
    if (type === 'region') {
      const data = await getRegionStats(currentYear)
      return NextResponse.json({ success: true, data })
    }
    
    if (type === 'disease') {
      const data = await getDiseaseStats(currentYear)
      return NextResponse.json({ success: true, data })
    }
    
    if (type === 'death') {
      const data = await getDeathStats(currentYear)
      return NextResponse.json({ success: true, data })
    }
    
    // 전체 데이터 (메인페이지용)
    const [periodData, regionData, diseaseData] = await Promise.all([
      getPeriodStats(currentYear),
      getRegionStats(currentYear),
      getDiseaseStats(currentYear),
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        period: periodData,
        region: regionData,
        disease: diseaseData,
      }
    })
    
  } catch (error) {
    console.error('Disease stats API error:', error)
    return NextResponse.json(
      { success: false, error: '데이터를 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}
