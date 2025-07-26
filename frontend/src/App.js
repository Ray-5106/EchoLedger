import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
      fetchRecentAlerts(); // Refresh alerts
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
    const interval = setInterval(fetchRecentAlerts, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getAlertStyle = (action) => {
    switch (action) {
      case "alert_ER":
        return "bg-red-100 border-red-500 text-red-800";
      case "continue_treatment":
        return "bg-green-100 border-green-500 text-green-800";
      case "recommend_review":
        return "bg-yellow-100 border-yellow-500 text-yellow-800";
      default:
        return "bg-gray-100 border-gray-500 text-gray-800";
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-red-600 mb-4 flex items-center">
          🚨 GhostChart Emergency Directive Verification
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patient ID
            </label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Enter Patient ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Emergency Situation
            </label>
            <select
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="cardiac_arrest">Cardiac Arrest</option>
              <option value="respiratory_failure">Respiratory Failure</option>
              <option value="stroke">Stroke</option>
              <option value="trauma">Severe Trauma</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleEmergencyCheck}
              disabled={loading || !patientId.trim()}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
              {loading ? "Checking..." : "🔍 Emergency Check"}
            </button>
          </div>
        </div>

        {checkResult && (
          <div className={`border-l-4 p-4 mb-4 rounded ${getAlertStyle(checkResult.action)}`}>
            <div className="flex items-center mb-2">
              <span className="font-bold text-lg">
                {checkResult.action === "alert_ER" ? "⚠️ DNR ALERT" : 
                 checkResult.action === "continue_treatment" ? "✅ PROCEED" : 
                 "📋 REVIEW REQUIRED"}
              </span>
            </div>
            <p className="text-sm mb-2">{checkResult.message}</p>
            <div className="text-xs opacity-75">
              Patient: {checkResult.patient_id} | 
              Directive Found: {checkResult.directive_found ? "✅" : "❌"} | 
              Signature Verified: {checkResult.signature_verified ? "✅" : "❌"}
            </div>
          </div>
        )}
      </div>

      {/* Recent Alerts */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">📊 Recent Emergency Alerts</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {recentAlerts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent alerts</p>
          ) : (
            recentAlerts.map((alert, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-blue-800">{alert.alert_type}</span>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <p className="text-xs text-gray-400">Patient: {alert.patient_id}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Directive Processing Component
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-blue-600 mb-4 flex items-center">
          🧠 AI Directive Processing (NLP)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Patient ID</label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Enter Patient ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Patient Name</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Enter Patient Name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Advance Directive Text
          </label>
          <textarea
            value={directiveText}
            onChange={(e) => setDirectiveText(e.target.value)}
            placeholder="Enter the patient's advance directive in natural language..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setDirectiveText(sampleDirective)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            📝 Use Sample Directive
          </button>
        </div>

        <button
          onClick={handleProcess}
          disabled={loading || !patientId.trim() || !patientName.trim() || !directiveText.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-md transition-colors mb-4"
        >
          {loading ? "Processing with AI..." : "🔬 Process with Llama3.1:8b"}
        </button>

        {processingResult && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-blue-800 mb-2">Processing Result:</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Action:</strong> {processingResult.action}</p>
              <p><strong>Confidence:</strong> {(processingResult.confidence_score * 100).toFixed(1)}%</p>
              
              {processingResult.elements && (
                <div>
                  <p><strong>Extracted Elements:</strong></p>
                  <ul className="ml-4 list-disc">
                    <li>DNR Detected: {processingResult.elements.dnr_detected ? "✅ Yes" : "❌ No"}</li>
                    {processingResult.elements.dnr_conditions?.length > 0 && (
                      <li>Conditions: {processingResult.elements.dnr_conditions.join(", ")}</li>
                    )}
                    {processingResult.elements.organ_donation?.length > 0 && (
                      <li>Organ Donation: {processingResult.elements.organ_donation.join(", ")}</li>
                    )}
                    {processingResult.elements.data_consent?.research_allowed && (
                      <li>Research Consent: ✅ Anonymized data sharing allowed</li>
                    )}
                  </ul>
                </div>
              )}
              
              <p><strong>Next Step:</strong> {processingResult.next_step}</p>
            </div>
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

  const executeDeathDirectives = async () => {
    if (!patientId.trim()) return;
    
    try {
      const response = await axios.post(`${API}/death/execute?patient_id=${patientId}`);
      setExecutionResult(response.data);
      fetchOrganReferrals();
    } catch (error) {
      console.error("Death directive execution failed:", error);
    }
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-green-600 mb-4 flex items-center">
          🫀 Autonomous Organ Donation Coordination
        </h2>
        
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            placeholder="Enter Patient ID for Death Directives"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={executeDeathDirectives}
            disabled={!patientId.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            ⚡ Execute Death Directives
          </button>
        </div>

        {executionResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-green-800 mb-2">Autonomous Execution Complete</h3>
            <p className="text-sm mb-2">Patient: {executionResult.patient_id}</p>
            <p className="text-sm mb-2">Actions Executed: {executionResult.total_actions}</p>
            <div className="text-xs">
              {executionResult.actions_executed?.map((action, index) => (
                <div key={index} className="bg-white p-2 rounded border mb-1">
                  <strong>{action.action}:</strong> {action.message || JSON.stringify(action)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🚚 Active Organ Referrals</h3>
        <div className="space-y-2">
          {organReferrals.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No active organ referrals</p>
          ) : (
            organReferrals.map((referral, index) => (
              <div key={index} className="bg-green-50 p-4 rounded border-l-4 border-green-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-green-800">
                      Patient: {referral.patient_id}
                    </p>
                    <p className="text-sm">Organs: {referral.organs.join(", ")}</p>
                    <p className="text-sm">Destination: {referral.destination}</p>
                    <p className="text-sm">Priority: {referral.priority}</p>
                    {referral.match_probability && (
                      <p className="text-sm">Match Probability: {(referral.match_probability * 100).toFixed(1)}%</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(referral.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState("emergency");

  const tabs = [
    { id: "emergency", label: "🚨 Emergency ER", component: EmergencyDashboard },
    { id: "directive", label: "🧠 AI Processing", component: DirectiveProcessor },
    { id: "organ", label: "🫀 Organ Coordination", component: OrganCoordination }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || EmergencyDashboard;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-blue-600">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">👻</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">GhostChart AI</h1>
                <p className="text-sm text-gray-600">Autonomous Health Directive Executor</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">WCHL 2025 Competition Entry</p>
              <p className="text-xs text-gray-500">ICP Mainnet Ready</p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto">
        <ActiveComponent />
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-bold mb-2">🔒 HIPAA Compliant</h3>
              <p className="text-sm text-gray-300">All PHI protected for 50 years post-mortem as required by law.</p>
            </div>
            <div>
              <h3 className="font-bold mb-2">⚡ Real-Time Verification</h3>
              <p className="text-sm text-gray-300">Sub-second blockchain verification using ICP Threshold ECDSA.</p>
            </div>
            <div>
              <h3 className="font-bold mb-2">🧠 AI-Powered</h3>
              <p className="text-sm text-gray-300">Llama3.1:8b NLP processing for natural language directives.</p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-6 pt-4 text-center">
            <p className="text-sm text-gray-400">
              GhostChart AI © 2025 | Built for WCHL 2025 on Internet Computer Protocol
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;