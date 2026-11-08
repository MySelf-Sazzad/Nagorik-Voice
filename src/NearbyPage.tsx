import { useEffect, useMemo, useState } from 'react'
import { Bookmark, Compass, Filter, Locate, MapPin, Navigation, RefreshCw, ThumbsUp } from 'lucide-react'
import type { Issue } from './data'
import { calculateDistanceKm, DHAKA_AREAS, DHAKA_FALLBACK_LOCATION, formatDistance, getUserLocation, type UserCoords } from './lib/location'

interface Props {
  issues: Issue[]
  openIssue: (issue: Issue) => void
  supportIssue: (id: number) => void
  saveIssue: (id: number) => void
  toast: (msg: string) => void
}

type RadiusOption = 0.2 | 1 | 5 | 10 | 'all'

export default function NearbyPage({ issues, openIssue, supportIssue, saveIssue, toast }: Props) {
  const [userLocation, setUserLocation] = useState<UserCoords>(DHAKA_FALLBACK_LOCATION)
  const [locating, setLocating] = useState(false)
  const [permissionAsked, setPermissionAsked] = useState(false)
  const [selectedRadius, setSelectedRadius] = useState<RadiusOption>(5)
  const [selectedCategory, setSelectedCategory] = useState('All categories')

  // Request location on initial mount
  useEffect(() => {
    refreshLocation()
  }, [])

  const refreshLocation = async () => {
    setLocating(true)
    try {
      const loc = await getUserLocation()
      setUserLocation(loc)
      setPermissionAsked(true)
      if (!loc.isSimulated) {
        toast('Live location updated!')
      }
    } finally {
      setLocating(false)
    }
  }

  // Set a simulated test location (useful for local development & testing)
  const setAreaLocation = (areaName: string) => {
    const coords = DHAKA_AREAS[areaName]
    if (coords) {
      setUserLocation({
        lat: coords.lat,
        lng: coords.lng,
        label: `${areaName} (Test Area)`,
        isSimulated: true
      })
      toast(`Location set to ${areaName}`)
    }
  }

  // Only approved issues are considered
  const approvedIssues = useMemo(() => issues.filter(i => i.isApproved !== false), [issues])

  // Calculate distance for all approved issues
  const issuesWithDistance = useMemo(() => {
    return approvedIssues.map(issue => {
      const distance = calculateDistanceKm(userLocation.lat, userLocation.lng, issue.lat || 23.81, issue.lng || 90.39)
      return {
        ...issue,
        distanceKm: distance
      }
    })
  }, [approvedIssues, userLocation])

  // Filter by selected radius & category
  const nearbyIssues = useMemo(() => {
    return issuesWithDistance
      .filter(issue => {
        const matchesCategory = selectedCategory === 'All categories' || issue.category === selectedCategory
        const matchesRadius = selectedRadius === 'all' || (issue.distanceKm !== undefined && issue.distanceKm <= selectedRadius)
        return matchesCategory && matchesRadius
      })
      .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
  }, [issuesWithDistance, selectedRadius, selectedCategory])

  const radiusLabels: { value: RadiusOption; label: string }[] = [
    { value: 0.2, label: '200 meters' },
    { value: 1, label: '1 km' },
    { value: 5, label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 'all', label: 'All distances' }
  ]

  return (
    <div className="page nearby-page">
      <div className="nearby-hero">
        <span className="eyebrow" style={{ color: '#93c5fd' }}>
          LOCAL CIVIC RADAR
        </span>
        <h1>Find Nearby Issues</h1>
        <p>Explore verified community reports around your current live location. Filter by radius to see what is happening in your immediate neighbourhood.</p>

        <div className="nearby-location-bar">
          <div className="nearby-location-info">
            <span className="nearby-location-dot" />
            <span>
              {userLocation.label || 'Live GPS'}: {userLocation.lat.toFixed(4)}°N, {userLocation.lng.toFixed(4)}°E
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              style={{
                background: '#ffffff1e',
                color: '#fff',
                border: '1px solid #ffffff33',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
              value={Object.keys(DHAKA_AREAS).find(k => DHAKA_AREAS[k].lat === userLocation.lat) || ''}
              onChange={e => {
                if (e.target.value) setAreaLocation(e.target.value)
                else refreshLocation()
              }}
            >
              <option value="" style={{ color: '#000' }}>
                Device GPS Location
              </option>
              {Object.keys(DHAKA_AREAS).map(area => (
                <option key={area} value={area} style={{ color: '#000' }}>
                  Simulate: {area}
                </option>
              ))}
            </select>

            <button type="button" className="nearby-refresh-btn" onClick={refreshLocation} disabled={locating}>
              <RefreshCw size={13} className={locating ? 'spin' : ''} />
              {locating ? 'Locating…' : 'Update GPS'}
            </button>
          </div>
        </div>
      </div>

      {userLocation.isSimulated && permissionAsked && (
        <div className="location-permission-box">
          <div>
            <Compass size={20} />
            <span>
              Tip: Allow browser location permission to automatically track your real live coordinates.
            </span>
          </div>
          <button type="button" onClick={refreshLocation}>
            <Locate size={14} style={{ marginRight: '4px' }} /> Request Live GPS
          </button>
        </div>
      )}

      {/* Radius Configurator */}
      <div className="radius-filter-card">
        <div className="radius-label">
          <Navigation size={17} color="#0869cf" />
          <span>Select Detection Radius:</span>
        </div>
        <div className="radius-buttons">
          {radiusLabels.map(r => (
            <button
              key={String(r.value)}
              type="button"
              className={`radius-btn ${selectedRadius === r.value ? 'active' : ''}`}
              onClick={() => setSelectedRadius(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="nearby-count-banner">
        <span>
          Showing <strong>{nearbyIssues.length}</strong> approved issue{nearbyIssues.length === 1 ? '' : 's'} within{' '}
          <strong>{selectedRadius === 'all' ? 'any distance' : radiusLabels.find(r => r.value === selectedRadius)?.label}</strong>
        </span>
      </div>

      {nearbyIssues.length === 0 ? (
        <div className="empty" style={{ margin: '20px 0', padding: '50px 20px' }}>
          <MapPin size={42} color="#94a3b8" />
          <h3 style={{ marginTop: '14px' }}>No civic issues within this radius</h3>
          <p>We could not find any approved reports within {radiusLabels.find(r => r.value === selectedRadius)?.label} of your location.</p>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              type="button"
              className="primary small"
              onClick={() => setSelectedRadius(5)}
            >
              Expand to 5 km
            </button>
            <button
              type="button"
              className="primary small"
              onClick={() => setSelectedRadius('all')}
              style={{ background: '#475569' }}
            >
              Show all distances
            </button>
          </div>
        </div>
      ) : (
        <div className="nearby-issues-list" style={{ display: 'grid', gap: '16px' }}>
          {nearbyIssues.map(issue => (
            <article className="issue-card" key={issue.id} style={{ margin: 0 }}>
              <div className="post-head">
                <div className="avatar large">{issue.avatar}</div>
                <div className="author">
                  <b>{issue.author}</b>
                  <span>@{issue.handle} · {issue.time}</span>
                </div>
                <span className={`distance-pill ${issue.distanceKm && issue.distanceKm > 5 ? 'far' : ''}`} style={{ marginLeft: 'auto' }}>
                  <Navigation size={12} />
                  {formatDistance(issue.distanceKm || 0)}
                </span>
              </div>

              <div className="location-line">
                <MapPin size={15} />
                <span>{issue.location}</span>
              </div>

              <div className="badges">
                <span className="category">{issue.category}</span>
                <span className={`status ${issue.status.toLowerCase().replaceAll(' ', '-')}`}>{issue.status}</span>
                <span className={`severity ${issue.severity.toLowerCase()}`}>{issue.severity}</span>
              </div>

              <h2 onClick={() => openIssue(issue)} style={{ cursor: 'pointer' }}>
                {issue.title}
              </h2>
              <p className="post-copy">{issue.description}</p>

              {issue.image && (
                <div className="issue-photo" onClick={() => openIssue(issue)} style={{ cursor: 'pointer' }}>
                  <img src={issue.image} alt={issue.title} />
                </div>
              )}

              <div className="engagement">
                <span>
                  <b>{issue.supports.toLocaleString()}</b> community supports
                </span>
                <span>{issue.comments} comments · {issue.shares} shares</span>
              </div>

              <div className="post-actions">
                <button
                  type="button"
                  className={issue.supported ? 'supported' : ''}
                  onClick={() => supportIssue(issue.id)}
                >
                  <ThumbsUp size={18} />
                  {issue.supported ? 'Supported' : 'Support'}
                </button>
                <button type="button" onClick={() => openIssue(issue)}>
                  View issue details →
                </button>
                <button
                  type="button"
                  className={issue.saved ? 'saved' : ''}
                  onClick={() => saveIssue(issue.id)}
                >
                  <Bookmark size={18} fill={issue.saved ? 'currentColor' : 'none'} />
                  <span>Save</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
