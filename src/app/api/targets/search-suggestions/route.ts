import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAppSettings } from '@/lib/settings'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const prefix = searchParams.get('prefix')
    const query = searchParams.get('query') || ''

    if (!prefix || !['name', 'address', 'labels', 'module', 'status', 'prober'].includes(prefix)) {
      return NextResponse.json({ error: 'Invalid prefix' }, { status: 400 })
    }

    // Get app settings
    const appSettings = await getAppSettings()
    const maxSuggestions = appSettings.maxSuggestions || 5
    const hiddenLabels = appSettings.hiddenLabels || []

    let suggestions: any[] = []

    switch (prefix) {
      case 'name':
        // Get most common target names that match the query
        const nameResults = await db.blackboxTarget.findMany({
          where: {
            name: {
              contains: query
            }
          },
          select: {
            name: true
          },
          distinct: ['name'],
          orderBy: {
            name: 'asc'
          },
          take: maxSuggestions
        })
        
        suggestions = nameResults.map(result => ({
          label: `name:${result.name}`,
          placeholder: `name:${result.name}`,
          description: `Search for target "${result.name}"`
        }))
        break

      case 'address':
        // Get most common addresses that match the query
        const addressResults = await db.blackboxTarget.findMany({
          where: {
            url: {
              contains: query
            }
          },
          select: {
            url: true
          },
          distinct: ['url'],
          orderBy: {
            url: 'asc'
          },
          take: maxSuggestions
        })
        
        suggestions = addressResults.map(result => ({
          label: `address:${result.url}`,
          placeholder: `address:${result.url}`,
          description: `Search for URL "${result.url}"`
        }))
        break

      case 'labels':
        // Get unique label keys and values that match the query
        const targets = await db.blackboxTarget.findMany({
          where: {
            labels: {
              not: null
            }
          },
          select: {
            labels: true
          },
          take: 100 // Limit to avoid too much data
        })

        const labelSet = new Set<string>()
        targets.forEach(target => {
          if (target.labels) {
            try {
              // Try to parse as JSON first
              const labelsObj = typeof target.labels === 'string' ? JSON.parse(target.labels) : target.labels
              Object.entries(labelsObj).forEach(([key, value]) => {
                // Skip hidden labels
                if (hiddenLabels.includes(key)) return
                
                const labelString = `${key}=${value}`
                // Match against partial queries like "env=" or "env=p"
                if (query === '' || 
                    labelString.toLowerCase().includes(query.toLowerCase()) ||
                    (query.includes('=') && labelString.toLowerCase().startsWith(query.toLowerCase())) ||
                    (!query.includes('=') && key.toLowerCase().includes(query.toLowerCase()))) {
                  labelSet.add(labelString)
                }
              })
            } catch {
              // Fallback to key=value parsing
              const labelPairs = target.labels.split(',').map((pair: string) => pair.trim())
              labelPairs.forEach((pair: string) => {
                // Extract key from pair to check if it's hidden
                const key = pair.split('=')[0]
                if (hiddenLabels.includes(key)) return
                
                const labelString = pair
                // Match against partial queries like "env=" or "env=p"
                if (query === '' || 
                    labelString.toLowerCase().includes(query.toLowerCase()) ||
                    (query.includes('=') && labelString.toLowerCase().startsWith(query.toLowerCase())) ||
                    (!query.includes('=') && labelString.toLowerCase().includes(query.toLowerCase()))) {
                  labelSet.add(labelString)
                }
              })
            }
          }
        })

        // Convert to array and sort
        let allLabels = Array.from(labelSet).sort()
        
        // If query has equals sign, prioritize exact matches
        if (query.includes('=')) {
          const exactMatches = allLabels.filter(label => 
            label.toLowerCase().startsWith(query.toLowerCase())
          )
          const partialMatches = allLabels.filter(label => 
            !label.toLowerCase().startsWith(query.toLowerCase()) && 
            label.toLowerCase().includes(query.toLowerCase())
          )
          allLabels = [...exactMatches, ...partialMatches]
        }

        suggestions = allLabels.slice(0, maxSuggestions).map(label => ({
          label: `labels:${label}`,
          placeholder: `labels:${label}`,
          description: `Search for label "${label}"`
        }))
        break

      case 'module':
        // Get available module types
        const moduleResults = await db.blackboxTarget.findMany({
          select: {
            module: true
          },
          distinct: ['module'],
          orderBy: {
            module: 'asc'
          }
        })

        const filteredModules = moduleResults
          .filter(result => result.module && result.module.toLowerCase().includes(query.toLowerCase()))
          .slice(0, maxSuggestions)

        suggestions = filteredModules.map(result => ({
          label: `module:${result.module}`,
          placeholder: `module:${result.module}`,
          description: `Search for module "${result.module}"`
        }))
        break

      case 'status':
        // Status suggestions are static
        const statusOptions = ['enabled', 'disabled']
        const filteredStatuses = statusOptions.filter(status => 
          status.toLowerCase().includes(query.toLowerCase())
        )

        suggestions = filteredStatuses.map(status => ({
          label: `status:${status}`,
          placeholder: `status:${status}`,
          description: `Search for ${status} targets`
        }))
        break

      case 'prober':
        // Get prober suggestions
        const proberResults = await db.proberInstance.findMany({
          where: {
            OR: [
              {
                name: {
                  contains: query
                }
              },
              {
                address: {
                  contains: query
                }
              }
            ]
          },
          select: {
            id: true,
            name: true,
            address: true
          },
          orderBy: {
            name: 'asc'
          },
          take: maxSuggestions
        })

        // Add "unassigned" option if query matches it
        const proberSuggestions = proberResults.map(result => ({
          label: `prober:${result.name}`,
          placeholder: `prober:${result.name}`,
          description: `Search for prober "${result.name} (${result.address})"`
        }))

        // Add "unassigned" option if it matches the query or if query is empty
        if (query === '' || 'unassigned'.toLowerCase().includes(query.toLowerCase())) {
          proberSuggestions.unshift({
            label: 'prober:unassigned',
            placeholder: 'prober:unassigned',
            description: 'Search for targets without assigned prober'
          })
        }

        suggestions = proberSuggestions
        break
    }

    // If no suggestions found, return empty array
    if (suggestions.length === 0) {
      return NextResponse.json([])
    }

    return NextResponse.json(suggestions)

  } catch (error) {
    console.error('Search suggestions error:', error)
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 })
  }
}