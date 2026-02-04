import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.DISEASE_API_KEY || process.env.DATA_GO_KR_API_KEY
const BASE_URL = 'https://apis.data.go.kr/1790387/EIDAPIService'

// 감염병별 발생 현황
async function getDiseaseStats(year: string, numOfRows: number = 100) {
  const url = `${BASE_URL}/Disease?serviceKey=${API_KEY}&resType=2&searchType=1&searchYear=${year}&patntType=1&numOfRows=${numOfRows}&pageNo=1`
  
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } })
    const text = await response.text()
    
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

// 지역별 감염병 발생 현황 - 모든 시도 데이터 가져오기
async function getRegionStats(year: string) {
  // 시도 코드: 01~17 (00은 전체)
  const sidoCodes = [
    { code: '01', name: '서울' },
    { code: '02', name: '부산' },
    { code: '03', name: '대구' },
    { code: '04', name: '인천' },
    { code: '05', name: '광주' },
    { code: '06', name: '대전' },
    { code: '07', name: '울산' },
    { code: '08', name: '경기' },
    { code: '09', name: '강원' },
    { code: '10', name: '충북' },
    { code: '11', name: '충남' },
    { code: '12', name: '전북' },
    { code: '13', name: '전남' },
    { code: '14', name: '경북' },
    { code: '15', name: '경남' },
    { code: '16', name: '제주' },
    { code: '17', name: '세종' },
  ]
  
  // 모든 지역 병렬 요청
  const results = await Promise.all(
    sidoCodes.map(async (sido) => {
      const url = `${BASE_URL}/Region?serviceKey=${API_KEY}&resType=2&searchType=1&searchYear=${year}&searchSidoCd=${sido.code}&numOfRows=100&pageNo=1`
      
      try {
        const response = await fetch(url, { next: { revalidate: 3600 } })
        const data = await response.json()
        
        const items = data?.response?.body?.items?.item
        if (!items) return null
        
        const itemList = Array.isArray(items) ? items : [items]
        
        // 해당 지역의 감염병별 발생 건수 집계
        let total = 0
        const diseases: { name: string; count: number }[] = []
        
        itemList.forEach((item: any) => {
          const count = parseInt(item.resultVal?.toString().replace(/,/g, '') || '0')
          const diseaseName = item.icdNm?.replace('@', '').trim() || ''
          
          if (count > 0 && diseaseName) {
            total += count
            diseases.push({ name: diseaseName, count })
          }
        })
        
        return {
          name: sido.name,
          total,
          diseases: diseases.sort((a, b) => b.count - a.count).slice(0, 10)
        }
      } catch (error) {
        console.error(`Region ${sido.name} error:`, error)
        return null
      }
    })
  )
  
  // null 제거하고 정렬
  return results
    .filter((r): r is NonNullable<typeof r> => r !== null && r.total > 0)
    .sort((a, b) => b.total - a.total)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'all'
  const limit = parseInt(searchParams.get('limit') || '100')
  
  const currentYear = '2024'
  const now = new Date()
  const dataTimestamp = now.toISOString()
  
  try {
    if (type === 'disease') {
      const data = await getDiseaseStats(currentYear, limit)
      return NextResponse.json({ 
        success: true, 
        timestamp: dataTimestamp,
        dataYear: currentYear,
        data 
      })
    }
    
    if (type === 'region') {
      const data = await getRegionStats(currentYear)
      return NextResponse.json({ 
        success: true, 
        timestamp: dataTimestamp,
        dataYear: currentYear,
        data 
      })
    }
    
    // 전체 데이터 (메인페이지용)
    const [diseaseData, regionData] = await Promise.all([
      getDiseaseStats(currentYear, 100),
      getRegionStats(currentYear),
    ])
    
    // 감염병 데이터 가공
    let processedDiseases: any[] = []
    const diseaseItems = diseaseData?.response?.body?.items?.item
    
    if (diseaseItems && Array.isArray(diseaseItems)) {
      processedDiseases = diseaseItems
        .filter((item: any) => {
          const val = item.resultVal?.toString().replace(/,/g, '')
          return val && val !== '0' && val !== '-'
        })
        .map((item: any) => ({
          name: item.icdNm?.replace('@', '').trim() || '알 수 없음',
          count: parseInt(item.resultVal?.toString().replace(/,/g, '') || '0'),
          group: item.icdGroupNm || '',
          year: item.year || currentYear,
        }))
        .sort((a: any, b: any) => b.count - a.count)
    }
    
    // 지역별 데이터 - getRegionStats가 이미 가공된 배열 반환
    let processedRegions = regionData || []
    
    console.log('Region data count:', processedRegions.length)
    
    // 지역 데이터가 없으면 샘플 사용
    let isRegionSample = false
    if (processedRegions.length === 0) {
      isRegionSample = true
      processedRegions = [
        { name: '서울', total: 28453, diseases: [{ name: '백일해', count: 8234 }, { name: 'CRE 감염증', count: 7821 }, { name: '수두', count: 5432 }] },
        { name: '경기', total: 35621, diseases: [{ name: '백일해', count: 12453 }, { name: 'CRE 감염증', count: 9876 }, { name: '수두', count: 6543 }] },
        { name: '부산', total: 12876, diseases: [{ name: '백일해', count: 4532 }, { name: 'CRE 감염증', count: 3876 }, { name: '수두', count: 2134 }] },
        { name: '대구', total: 8932, diseases: [{ name: '백일해', count: 3421 }, { name: 'CRE 감염증', count: 2654 }, { name: '수두', count: 1543 }] },
        { name: '인천', total: 11234, diseases: [{ name: '백일해', count: 4123 }, { name: 'CRE 감염증', count: 3456 }, { name: '수두', count: 2123 }] },
        { name: '광주', total: 6543, diseases: [{ name: '백일해', count: 2341 }, { name: 'CRE 감염증', count: 1987 }, { name: '수두', count: 1234 }] },
        { name: '대전', total: 5876, diseases: [{ name: '백일해', count: 2134 }, { name: 'CRE 감염증', count: 1765 }, { name: '수두', count: 1098 }] },
        { name: '울산', total: 4321, diseases: [{ name: '백일해', count: 1654 }, { name: 'CRE 감염증', count: 1234 }, { name: '수두', count: 876 }] },
      ]
    }
    
    return NextResponse.json({
      success: true,
      timestamp: dataTimestamp,
      dataYear: currentYear,
      data: {
        diseases: processedDiseases,
        regions: processedRegions,
        isRegionSample,
        totalDiseaseCount: processedDiseases.reduce((sum, d) => sum + d.count, 0),
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
