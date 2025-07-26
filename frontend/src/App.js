import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Hero/Intro Section Component
const HeroSection = ({ onGetStarted }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [statsCounter, setStatsCounter] = useState({ organs: 0, lives: 0, hospitals: 0 });

  useEffect(() => {
    setIsVisible(true);
    
    // Animated counter effect
    const timer = setInterval(() => {
      setStatsCounter(prev => ({
        organs: prev.organs < 28000 ? prev.organs + 500 : 28000,
        lives: prev.lives < 117 ? prev.lives + 2 : 117,
        hospitals: prev.hospitals < 6090 ? prev.hospitals + 100 : 6090
      }));
    }, 50);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hero-section">
      {/* Hero Background */}
      <div className="hero-background">
        <img 
          src="https://images.unsplash.com/photo-1624004015322-a94d3a4eff39?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwxfHxlbWVyZ2VuY3klMjByb29tfGVufDB8fHx8MTc1MzU0NzE2MXww&ixlib=rb-4.1.0&q=85"
          alt="Emergency Medical Technology"
          className="hero-bg-image"
        />
        <div className="hero-overlay"></div>
      </div>

      {/* Hero Content */}
      <div className={`hero-content ${isVisible ? 'hero-visible' : ''}`}>
        <div className="container mx-auto px-6 text-center">
          
          {/* Competition Badge */}
          <div className="competition-badge">
            <span className="badge-text">🏆 WCHL 2025 Competition Entry</span>
            <span className="badge-track">AI Track - Decentralized Intelligence</span>
          </div>

          {/* Main Heading */}
          <h1 className="hero-title">
            <span className="gradient-text">👻 GhostChart AI</span>
            <br />
            <span className="hero-subtitle">Autonomous Health Directive Executor</span>
          </h1>

          {/* Value Proposition */}
          <p className="hero-description">
            The first <strong>fully autonomous</strong> healthcare system that honors patient wishes in real-time.
            <br />
            Built on <strong>Internet Computer Protocol</strong> with AI-powered medical directive enforcement.
          </p>

          {/* Crisis Statistics */}
          <div className="crisis-stats">
            <div className="stat-item">
              <div className="stat-number">{statsCounter.organs.toLocaleString()}</div>
              <div className="stat-label">Organs Wasted Annually</div>
            </div>
            <div className="stat-divider">•</div>
            <div className="stat-item">
              <div className="stat-number">{statsCounter.lives}</div>
              <div className="stat-label">Lives Lost Daily</div>
            </div>
            <div className="stat-divider">•</div>
            <div className="stat-item">
              <div className="stat-number">{statsCounter.hospitals.toLocaleString()}</div>
              <div className="stat-label">US Hospitals</div>
            </div>
          </div>

          {/* Key Features */}
          <div className="hero-features">
            <div className="feature-item">
              <div className="feature-icon">⚡</div>
              <div className="feature-text">Sub-Second<br />Emergency Alerts</div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🧠</div>
              <div className="feature-text">AI-Powered<br />Llama3.1:8b NLP</div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🛡️</div>
              <div className="feature-text">HIPAA Compliant<br />50-Year Protection</div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🤖</div>
              <div className="feature-text">Fully Autonomous<br />No Human Needed</div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="hero-cta">
            <button 
              onClick={onGetStarted}
              className="cta-primary"
            >
              <span>🚀 Experience Live Demo</span>
              <div className="button-shine"></div>
            </button>
            <button className="cta-secondary">
              <span>📋 View ICP Canisters</span>
            </button>
          </div>

          {/* Tech Stack Icons */}
          <div className="tech-stack">
            <div className="tech-label">Built with:</div>
            <div className="tech-icons">
              <div className="tech-item">
                <span className="tech-icon">🔗</span>
                <span>ICP</span>
              </div>
              <div className="tech-item">
                <span className="tech-icon">🦀</span>
                <span>Rust</span>
              </div>
              <div className="tech-item">
                <span className="tech-icon">🔷</span>
                <span>Motoko</span>
              </div>
              <div className="tech-item">
                <span className="tech-icon">🧠</span>
                <span>Llama3.1</span>
              </div>
              <div className="tech-item">
                <span className="tech-icon">⚛️</span>
                <span>React</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Emergency Dashboard Component
const EmergencyDashboard = () => {
  const [patientId, setPatientId] = useState("");
  const [hospitalId, setHospitalId] = useState("EMERGENCY_ROOM_001");
  const [situation, setSituation] = useState("cardiac_arrest");
  const [checkResult, setCheckResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState([]);

  const handleEmergencyCheck = async () => {
    if (!patientId.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/emergency/check`, {
        patient_id: patientId,
        hospital_id: hospitalId,
        situation: situation,
        vitals: { bp: "80/50", pulse: 120, oxygen: 85 }
      });
      setCheckResult(response.data);
      fetchRecentAlerts();
    } catch (error) {
      console.error("Emergency check failed:", error);
      setCheckResult({
        action: "system_error",
        message: "System temporarily unavailable. Use manual verification."
      });
    }
    setLoading(false);
  };

  const fetchRecentAlerts = async () => {
    try {
      const response = await axios.get(`${API}/alerts/recent`);
      setRecentAlerts(response.data);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    }
  };

  useEffect(() => {
    fetchRecentAlerts();
    const interval = setInterval(fetchRecentAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const getAlertStyle = (action) => {
    switch (action) {
      case "alert_ER":
        return "alert-critical";
      case "continue_treatment":
        return "alert-success";
      case "recommend_review":
        return "alert-warning";
      default:
        return "alert-info";
    }
  };

  const getAlertIcon = (action) => {
    switch (action) {
      case "alert_ER": return "🚨";
      case "continue_treatment": return "✅";
      case "recommend_review": return "⚠️";
      default: return "ℹ️";
    }
  };

  return (
    <div className="dashboard-container">
      {/* Emergency Verification Card */}
      <div className="medical-card emergency-card">
        <div className="card-header">
          <div className="header-icon">🚨</div>
          <div>
            <h2 className="card-title">Emergency Directive Verification</h2>
            <p className="card-subtitle">Real-time DNR status lookup for ER staff</p>
          </div>
          <div className="pulse-indicator"></div>
        </div>
        
        <div className="form-grid">
          <div className="input-group">
            <label className="input-label">
              <span className="label-icon">👤</span>
              Patient ID
            </label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Enter Patient ID (try: dnr_patient_002)"
              className="medical-input"
            />
            <div className="input-helper">Try: dnr_patient_002, test_patient_001</div>
          </div>
          
          <div className="input-group">
            <label className="input-label">
              <span className="label-icon">🏥</span>
              Emergency Situation
            </label>
            <select
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              className="medical-select"
            >
              <option value="cardiac_arrest">🫀 Cardiac Arrest</option>
              <option value="respiratory_failure">🫁 Respiratory Failure</option>
              <option value="stroke">🧠 Stroke</option>
              <option value="trauma">🩹 Severe Trauma</option>
            </select>
          </div>
          
          <div className="button-group">
            <button
              onClick={handleEmergencyCheck}
              disabled={loading || !patientId.trim()}
              className="emergency-button"
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span className="button-icon">🔍</span>
                  <span>Emergency Check</span>
                </>
              )}
            </button>
          </div>
        </div>

        {checkResult && (
          <div className={`alert-result ${getAlertStyle(checkResult.action)}`}>
            <div className="alert-header">
              <span className="alert-icon">
                {getAlertIcon(checkResult.action)}
              </span>
              <span className="alert-title">
                {checkResult.action === "alert_ER" ? "⚠️ DNR DIRECTIVE FOUND" : 
                 checkResult.action === "continue_treatment" ? "✅ PROCEED WITH TREATMENT" : 
                 "📋 MANUAL REVIEW REQUIRED"}
              </span>
            </div>
            <div className="alert-message">{checkResult.message}</div>
            <div className="alert-details">
              <span className="detail-item">
                <strong>Patient:</strong> {checkResult.patient_id}
              </span>
              <span className="detail-divider">•</span>
              <span className="detail-item">
                <strong>Directive:</strong> {checkResult.directive_found ? "✅ Found" : "❌ Not Found"}
              </span>
              <span className="detail-divider">•</span>
              <span className="detail-item">
                <strong>Verified:</strong> {checkResult.signature_verified ? "✅ Valid" : "❌ Invalid"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Alerts */}
      <div className="medical-card alerts-card">
        <div className="card-header">
          <div className="header-icon">📊</div>
          <div>
            <h3 className="card-title">Live Emergency Alerts</h3>
            <p className="card-subtitle">Real-time directive verification history</p>
          </div>
          <div className="refresh-indicator"></div>
        </div>
        
        <div className="alerts-container">
          {recentAlerts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <p>No recent alerts</p>
              <span className="empty-subtitle">Emergency checks will appear here</span>
            </div>
          ) : (
            <div className="alerts-list">
              {recentAlerts.map((alert, index) => (
                <div key={index} className="alert-item">
                  <div className="alert-indicator"></div>
                  <div className="alert-content">
                    <div className="alert-row">
                      <span className="alert-type">{alert.alert_type}</span>
                      <span className="alert-time">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="alert-text">{alert.message}</p>
                    <span className="alert-patient">Patient: {alert.patient_id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// AI Processing Component
const DirectiveProcessor = () => {
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [directiveText, setDirectiveText] = useState("");
  const [processingResult, setProcessingResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const sampleDirective = `I, Sarah Chen, being of sound mind, do not want resuscitation if I have less than 5% chance of meaningful recovery. Donate my kidneys and corneas to those in need. I consent to sharing my anonymized medical data with cancer research institutions to help save lives.`;

  const handleProcess = async () => {
    if (!patientId.trim() || !patientName.trim() || !directiveText.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/directives/process`, {
        patient_id: patientId,
        patient_name: patientName,
        directive_text: directiveText
      });
      setProcessingResult(response.data);
    } catch (error) {
      console.error("Directive processing failed:", error);
      setProcessingResult({
        action: "PROCESSING_ERROR",
        message: "Failed to process directive. Please try again."
      });
    }
    setLoading(false);
  };

  return (
    <div className="dashboard-container">
      <div className="medical-card ai-card">
        <div className="card-header">
          <div className="header-icon">🧠</div>
          <div>
            <h2 className="card-title">AI Directive Processing</h2>
            <p className="card-subtitle">Llama3.1:8b powered medical NLP extraction</p>
          </div>
          <div className="ai-indicator">
            <span className="ai-pulse"></span>
            <span className="ai-text">AI Active</span>
          </div>
        </div>
        
        <div className="form-grid">
          <div className="input-row">
            <div className="input-group">
              <label className="input-label">
                <span className="label-icon">🆔</span>
                Patient ID
              </label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Enter Patient ID"
                className="medical-input"
              />
            </div>
            
            <div className="input-group">
              <label className="input-label">
                <span className="label-icon">👤</span>
                Patient Name
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Enter Patient Name"
                className="medical-input"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">
              <span className="label-icon">📋</span>
              Advance Directive Text
            </label>
            <textarea
              value={directiveText}
              onChange={(e) => setDirectiveText(e.target.value)}
              placeholder="Enter the patient's advance directive in natural language..."
              rows={6}
              className="medical-textarea"
            />
            <button
              onClick={() => setDirectiveText(sampleDirective)}
              className="sample-button"
            >
              📝 Use Sample Directive
            </button>
          </div>

          <button
            onClick={handleProcess}
            disabled={loading || !patientId.trim() || !patientName.trim() || !directiveText.trim()}
            className="ai-process-button"
          >
            {loading ? (
              <>
                <div className="ai-processing">
                  <div className="ai-spinner"></div>
                  <span>AI Processing...</span>
                </div>
              </>
            ) : (
              <>
                <span className="button-icon">🔬</span>
                <span>Process with Llama3.1:8b</span>
              </>
            )}
          </button>
        </div>

        {processingResult && (
          <div className="ai-result-card">
            <div className="result-header">
              <span className="result-icon">🧠</span>
              <h3>AI Processing Complete</h3>
              <div className="confidence-score">
                <span>Confidence: {(processingResult.confidence_score * 100).toFixed(1)}%</span>
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill"
                    style={{ width: `${processingResult.confidence_score * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {processingResult.elements && (
              <div className="extraction-results">
                <h4>Extracted Elements:</h4>
                <div className="results-grid">
                  <div className="result-item">
                    <div className="result-label">DNR Status</div>
                    <div className={`result-value ${processingResult.elements.dnr_detected ? 'positive' : 'negative'}`}>
                      {processingResult.elements.dnr_detected ? '✅ Detected' : '❌ Not Found'}
                    </div>
                  </div>
                  
                  {processingResult.elements.dnr_conditions?.length > 0 && (
                    <div className="result-item">
                      <div className="result-label">Conditions</div>
                      <div className="result-value">
                        {processingResult.elements.dnr_conditions.join(", ")}
                      </div>
                    </div>
                  )}
                  
                  {processingResult.elements.organ_donation?.length > 0 && (
                    <div className="result-item">
                      <div className="result-label">Organ Donation</div>
                      <div className="result-value positive">
                        {processingResult.elements.organ_donation.join(", ")}
                      </div>
                    </div>
                  )}
                  
                  {processingResult.elements.data_consent?.research_allowed && (
                    <div className="result-item">
                      <div className="result-label">Research Consent</div>
                      <div className="result-value positive">
                        ✅ Anonymized data sharing approved
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="next-step">
                  <strong>Next Step:</strong> {processingResult.next_step}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Organ Coordination Component
const OrganCoordination = () => {
  const [patientId, setPatientId] = useState("");
  const [organReferrals, setOrganReferrals] = useState([]);
  const [executionResult, setExecutionResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const executeDeathDirectives = async () => {
    if (!patientId.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/death/execute?patient_id=${patientId}`);
      setExecutionResult(response.data);
      fetchOrganReferrals();
    } catch (error) {
      console.error("Death directive execution failed:", error);
    }
    setLoading(false);
  };

  const fetchOrganReferrals = async () => {
    try {
      const response = await axios.get(`${API}/organ-referrals/active`);
      setOrganReferrals(response.data);
    } catch (error) {
      console.error("Failed to fetch organ referrals:", error);
    }
  };

  useEffect(() => {
    fetchOrganReferrals();
  }, []);

  return (
    <div className="dashboard-container">
      {/* Execution Control */}
      <div className="medical-card organ-card">
        <div className="card-header">
          <div className="header-icon">🫀</div>
          <div>
            <h2 className="card-title">Autonomous Organ Coordination</h2>
            <p className="card-subtitle">AI-powered organ donation and directive execution</p>
          </div>
          <div className="organ-indicator">
            <span className="organ-pulse"></span>
          </div>
        </div>
        
        <div className="execution-form">
          <div className="input-group">
            <label className="input-label">
              <span className="label-icon">👤</span>
              Patient ID for Death Directive Execution
            </label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Enter Patient ID (try: organ_donor_003)"
              className="medical-input"
            />
            <div className="input-helper">Try: organ_donor_003, test_patient_001</div>
          </div>
          
          <button
            onClick={executeDeathDirectives}
            disabled={!patientId.trim() || loading}
            className="execution-button"
          >
            {loading ? (
              <>
                <div className="loading-spinner"></div>
                <span>Executing...</span>
              </>
            ) : (
              <>
                <span className="button-icon">⚡</span>
                <span>Execute Death Directives</span>
              </>
            )}
          </button>
        </div>

        {executionResult && (
          <div className="execution-result">
            <div className="result-header">
              <span className="result-icon">⚡</span>
              <h3>Autonomous Execution Complete</h3>
            </div>
            <div className="execution-summary">
              <div className="summary-item">
                <span className="summary-label">Patient:</span>
                <span className="summary-value">{executionResult.patient_id}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Actions:</span>
                <span className="summary-value">{executionResult.total_actions}</span>
              </div>
            </div>
            <div className="actions-list">
              {executionResult.actions_executed?.map((action, index) => (
                <div key={index} className="action-item">
                  <div className="action-indicator"></div>
                  <div className="action-content">
                    <strong>{action.action}:</strong> {action.message || JSON.stringify(action)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Referrals */}
      <div className="medical-card referrals-card">
        <div className="card-header">
          <div className="header-icon">🚚</div>
          <div>
            <h3 className="card-title">Active Organ Referrals</h3>
            <p className="card-subtitle">Real-time organ procurement coordination</p>
          </div>
        </div>
        
        <div className="referrals-container">
          {organReferrals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🫀</div>
              <p>No active organ referrals</p>
              <span className="empty-subtitle">Organ referrals will appear here</span>
            </div>
          ) : (
            <div className="referrals-grid">
              {organReferrals.map((referral, index) => (
                <div key={index} className="referral-card">
                  <div className="referral-header">
                    <span className="referral-priority">{referral.priority.toUpperCase()}</span>
                    <span className="referral-time">
                      {new Date(referral.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="referral-content">
                    <div className="referral-patient">
                      <strong>Patient:</strong> {referral.patient_id}
                    </div>
                    <div className="referral-organs">
                      <strong>Organs:</strong> 
                      <div className="organs-list">
                        {referral.organs.map((organ, i) => (
                          <span key={i} className="organ-tag">{organ}</span>
                        ))}
                      </div>
                    </div>
                    <div className="referral-details">
                      <div className="detail-item">
                        <span>Destination:</span>
                        <span>{referral.destination}</span>
                      </div>
                      {referral.match_probability && (
                        <div className="detail-item">
                          <span>Match Probability:</span>
                          <span className="match-score">
                            {(referral.match_probability * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [showHero, setShowHero] = useState(true);
  const [activeTab, setActiveTab] = useState("emergency");

  const tabs = [
    { id: "emergency", label: "🚨 Emergency ER", component: EmergencyDashboard },
    { id: "directive", label: "🧠 AI Processing", component: DirectiveProcessor },
    { id: "organ", label: "🫀 Organ Coordination", component: OrganCoordination }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || EmergencyDashboard;

  const handleGetStarted = () => {
    setShowHero(false);
  };

  if (showHero) {
    return <HeroSection onGetStarted={handleGetStarted} />;
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-container">
          <button 
            onClick={() => setShowHero(true)}
            className="logo-section"
          >
            <div className="logo-icon">👻</div>
            <div className="logo-text">
              <h1 className="logo-title">GhostChart AI</h1>
              <p className="logo-subtitle">Autonomous Health Directive Executor</p>
            </div>
          </button>
          
          <div className="header-info">
            <div className="status-indicator">
              <span className="status-dot"></span>
              <span>Live System</span>
            </div>
            <div className="competition-info">
              <span className="competition-badge-small">WCHL 2025</span>
              <span className="mainnet-badge">ICP Mainnet Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="app-navigation">
        <div className="nav-container">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-tab ${activeTab === tab.id ? 'nav-active' : 'nav-inactive'}`}
            >
              <span className="nav-label">{tab.label}</span>
              {activeTab === tab.id && <div className="nav-indicator"></div>}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="app-main">
        <ActiveComponent />
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-section">
              <h3 className="footer-title">🔒 HIPAA Compliant</h3>
              <p className="footer-text">All PHI protected for 50 years post-mortem as required by law.</p>
            </div>
            <div className="footer-section">
              <h3 className="footer-title">⚡ Real-Time Verification</h3>
              <p className="footer-text">Sub-second blockchain verification using ICP Threshold ECDSA.</p>
            </div>
            <div className="footer-section">
              <h3 className="footer-title">🧠 AI-Powered</h3>
              <p className="footer-text">Llama3.1:8b NLP processing for natural language directives.</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copyright">
              GhostChart AI © 2025 | Built for WCHL 2025 on Internet Computer Protocol
            </p>
            <div className="footer-links">
              <span>🏆 Competition Entry</span>
              <span>•</span>
              <span>🌐 ICP Mainnet</span>
              <span>•</span>
              <span>🤖 AI Track</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;