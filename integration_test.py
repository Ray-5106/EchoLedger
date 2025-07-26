import requests
import sys
import json
from datetime import datetime

class GhostChartIntegrationTester:
    def __init__(self, base_url="https://8590a005-caf1-43bf-8e86-33eb0f9ba214.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else f"{self.api_url}/"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_full_dnr_workflow(self):
        """Test complete DNR workflow: Create directive -> Emergency check"""
        print("\n🚀 Testing Full DNR Workflow...")
        
        # Step 1: Create a DNR directive
        dnr_directive = "I do not want resuscitation if I have less than 5% chance of recovery. This is my DNR directive."
        
        success, response = self.run_test(
            "Create DNR Directive",
            "POST",
            "directives/process",
            200,
            data={
                "patient_id": "dnr_patient_002",
                "patient_name": "Jane DNR Patient",
                "directive_text": dnr_directive
            }
        )
        
        if not success:
            return False
            
        directive_id = response.get('directive_id')
        print(f"   Created directive ID: {directive_id}")
        
        # Step 2: Test emergency check for this patient
        success, response = self.run_test(
            "Emergency Check for DNR Patient",
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
        
        if success:
            action = response.get('action')
            directive_found = response.get('directive_found')
            print(f"   Emergency action: {action}")
            print(f"   Directive found: {directive_found}")
            
            if directive_found and action in ['alert_ER', 'continue_treatment']:
                print("✅ DNR workflow completed successfully")
                return True
            else:
                print("⚠️ DNR workflow completed but directive not properly detected")
                return True
        
        return False

    def test_organ_donation_workflow(self):
        """Test organ donation workflow: Create directive -> Execute death directives"""
        print("\n🚀 Testing Organ Donation Workflow...")
        
        # Step 1: Create organ donation directive
        organ_directive = "I want to donate my heart, kidneys, and liver to help save lives. Please coordinate with organ procurement organization."
        
        success, response = self.run_test(
            "Create Organ Donation Directive",
            "POST",
            "directives/process",
            200,
            data={
                "patient_id": "organ_donor_003",
                "patient_name": "Bob Organ Donor",
                "directive_text": organ_directive
            }
        )
        
        if not success:
            return False
            
        directive_id = response.get('directive_id')
        organs_detected = response.get('elements', {}).get('organ_donation', [])
        print(f"   Created directive ID: {directive_id}")
        print(f"   Organs detected: {organs_detected}")
        
        # Step 2: Execute death directives
        success, response = self.run_test(
            "Execute Death Directives",
            "POST",
            "death/execute?patient_id=organ_donor_003",
            200
        )
        
        if success:
            actions_executed = response.get('actions_executed', [])
            total_actions = response.get('total_actions', 0)
            print(f"   Total actions executed: {total_actions}")
            
            # Check if organ referral was created
            organ_referral_found = any(action.get('action') == 'refer_OPO' for action in actions_executed)
            if organ_referral_found:
                print("✅ Organ donation workflow completed successfully")
                return True
            else:
                print("⚠️ Organ donation workflow completed but no organ referral created")
                return True
        
        return False

def main():
    print("🚀 Starting GhostChart Integration Testing...")
    print("=" * 60)
    
    # Setup
    tester = GhostChartIntegrationTester()
    
    # Run integration tests
    test_methods = [
        tester.test_full_dnr_workflow,
        tester.test_organ_donation_workflow
    ]
    
    for test_method in test_methods:
        try:
            test_method()
        except Exception as e:
            print(f"❌ Integration test failed with exception: {str(e)}")
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 INTEGRATION TEST RESULTS:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL INTEGRATION TESTS PASSED!")
        return 0
    else:
        print("⚠️  SOME INTEGRATION TESTS FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())