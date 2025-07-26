import requests
import sys
import json
from datetime import datetime

class GhostChartAPITester:
    def __init__(self, base_url="https://8590a005-caf1-43bf-8e86-33eb0f9ba214.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else f"{self.api_url}/"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    print(f"   Response: {response.text[:200]}...")
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health check endpoint"""
        return self.run_test(
            "Health Check",
            "GET",
            "",
            200
        )

    def test_emergency_check_dnr_patient(self):
        """Test emergency check for DNR patient"""
        return self.run_test(
            "Emergency Check - DNR Patient",
            "POST",
            "emergency/check",
            200,
            data={
                "patient_id": "dnr_patient_002",
                "hospital_id": "EMERGENCY_ROOM_001",
                "situation": "cardiac_arrest",
                "vitals": {"bp": "80/50", "pulse": 120, "oxygen": 85}
            }
        )

    def test_emergency_check_unknown_patient(self):
        """Test emergency check for unknown patient"""
        return self.run_test(
            "Emergency Check - Unknown Patient",
            "POST",
            "emergency/check",
            200,
            data={
                "patient_id": "unknown_patient_999",
                "hospital_id": "EMERGENCY_ROOM_001",
                "situation": "cardiac_arrest",
                "vitals": {"bp": "80/50", "pulse": 120, "oxygen": 85}
            }
        )

    def test_directive_processing(self):
        """Test AI directive processing"""
        sample_directive = "I do not want resuscitation if I have less than 5% chance of recovery. Donate my kidneys and corneas."
        
        return self.run_test(
            "Directive Processing - AI NLP",
            "POST",
            "directives/process",
            200,
            data={
                "patient_id": "test_patient_001",
                "patient_name": "John Test Patient",
                "directive_text": sample_directive
            }
        )

    def test_death_directive_execution(self):
        """Test death directive execution"""
        return self.run_test(
            "Death Directive Execution",
            "POST",
            "death/execute?patient_id=organ_donor_003",
            200
        )

    def test_get_patient_directives(self):
        """Test getting patient directives"""
        return self.run_test(
            "Get Patient Directives",
            "GET",
            "patients/test_patient_001/directives",
            200
        )

    def test_get_recent_alerts(self):
        """Test getting recent alerts"""
        return self.run_test(
            "Get Recent Alerts",
            "GET",
            "alerts/recent",
            200
        )

    def test_get_organ_referrals(self):
        """Test getting active organ referrals"""
        return self.run_test(
            "Get Active Organ Referrals",
            "GET",
            "organ-referrals/active",
            200
        )

def main():
    print("🚀 Starting GhostChart API Testing...")
    print("=" * 60)
    
    # Setup
    tester = GhostChartAPITester()
    
    # Run all tests
    test_methods = [
        tester.test_health_check,
        tester.test_emergency_check_unknown_patient,
        tester.test_directive_processing,
        tester.test_emergency_check_dnr_patient,  # Run after creating directive
        tester.test_death_directive_execution,
        tester.test_get_patient_directives,
        tester.test_get_recent_alerts,
        tester.test_get_organ_referrals
    ]
    
    for test_method in test_methods:
        try:
            test_method()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print("⚠️  SOME TESTS FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())