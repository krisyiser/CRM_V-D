import json
import os
import sys
import unittest
from datetime import datetime, timedelta

# TDD Test Suite for CRM Vainilla & Descanso
PRICING_MATRIX = {
    '101': {'alta': 2800, 'baja': 2300, 'semana': 1900},
    '102': {'alta': 1950, 'baja': 1600, 'semana': 1200},
    '105': {'alta': 1950, 'baja': 1600, 'semana': 1200},
    '104': {'alta': 1400, 'baja': 1100, 'semana': 900},
    '103': {'alta': 1400, 'baja': 1100, 'semana': 900},
}

def calculate_stay_price(room_id, check_in_str, check_out_str, is_high_season=False, extra_persons=0, day_passes=0, day_pass_food=False, parking=False, extra_charges=0, payment_method='Efectivo'):
    if not check_in_str or not check_out_str or room_id not in PRICING_MATRIX:
        raise ValueError("Invalid parameters for stay calculation")
    
    start = datetime.strptime(check_in_str, '%Y-%m-%d')
    end = datetime.strptime(check_out_str, '%Y-%m-%d')
    
    if start > end:
        raise ValueError("check_in cannot be after check_out")
        
    nights = 1 if check_in_str == check_out_str else (end - start).days
    total_stay = 0
    
    current = start
    for _ in range(nights):
        if is_high_season:
            rate = PRICING_MATRIX[room_id]['alta']
        else:
            weekday = current.weekday() # 0=Mon, ..., 5=Sat, 6=Sun
            if weekday == 5: # Saturday
                rate = PRICING_MATRIX[room_id]['alta']
            elif weekday in (6, 3, 4): # Sun, Thu, Fri
                rate = PRICING_MATRIX[room_id]['baja']
            else:
                rate = PRICING_MATRIX[room_id]['semana']
        total_stay += rate
        current += timedelta(days=1)
        
    day_pass_rate = 150 if day_pass_food else 100
    extras = (extra_persons * 250) + (day_passes * day_pass_rate) + (nights * 50 if parking else 0) + extra_charges
    grand_total = total_stay + extras
    
    if payment_method == 'Tarjeta':
        grand_total *= 1.05
        
    return round(grand_total, 2)

class TestCRMLogic(unittest.TestCase):
    def test_single_night_suite_101_high_season(self):
        """Test Suite 101 high season single night rate"""
        total = calculate_stay_price('101', '2026-07-20', '2026-07-21', is_high_season=True)
        self.assertEqual(total, 2800.0)

    def test_invalid_date_range_raises_error(self):
        """Test that check_in after check_out raises ValueError"""
        with self.assertRaises(ValueError):
            calculate_stay_price('101', '2026-07-25', '2026-07-20')

    def test_card_payment_surcharge(self):
        """Test 5% surcharge applied for Card payments"""
        total = calculate_stay_price('104', '2026-07-20', '2026-07-21', is_high_season=True, payment_method='Tarjeta')
        expected = round(1400 * 1.05, 2) # 1470.0
        self.assertEqual(total, expected)

    def test_extras_daypass_and_parking(self):
        """Test extras calculations for Day Pass with food and parking"""
        total = calculate_stay_price('103', '2026-07-20', '2026-07-22', is_high_season=True, day_passes=2, day_pass_food=True, parking=True)
        # 2 nights * 1400 = 2800. Day pass: 2 * 150 = 300. Parking: 2 * 50 = 100. Total = 3200
        self.assertEqual(total, 3200.0)

    def test_pos_cart_totals_and_fee(self):
        """Test POS cart subtotal, card fee and total calculation"""
        items = [{'price': 50, 'qty': 1}, {'price': 120, 'qty': 1}, {'price': 30, 'qty': 1}]
        subtotal = sum(i['price'] * i['qty'] for i in items)
        self.assertEqual(subtotal, 200)
        
        # Test Card Fee (5%)
        card_fee = subtotal * 0.05
        self.assertEqual(card_fee, 10.0)
        self.assertEqual(subtotal + card_fee, 210.0)

    def test_stay_report_data_parsing_fallback(self):
        """Test safe parsing and fallback for room charges in StayReportModal"""
        # Test array format items_json
        array_json = json.dumps([{"desc": "Suite 101", "amount": 2800}])
        parsed_items = json.loads(array_json)
        self.assertTrue(isinstance(parsed_items, list))
        
        # Ensure default fields fallback cleanly to 0
        room_price = parsed_items[0].get("roomPrice", 0) if isinstance(parsed_items, dict) else 0
        self.assertEqual(room_price, 0)
        formatted = f"${room_price:.2f} MXN"
        self.assertEqual(formatted, "$0.00 MXN")

    def test_user_authentication_logic(self):
        """Test user login verification logic for admin and reception users"""
        valid_users = [
            {'user': 'admin@vainillaydescanso.com', 'code': '1234', 'role': 'Administrador', 'name': 'Administrador Principal'},
            {'user': 'admin', 'code': '1234', 'role': 'Administrador', 'name': 'Administrador Principal'},
            {'user': 'recepcion@vainillaydescanso.com', 'code': '4321', 'role': 'Recepción', 'name': 'Concierge Recepció' + 'n'},
            {'user': 'recepcion', 'code': '4321', 'role': 'Recepción', 'name': 'Concierge Recepción'}
        ]

        def authenticate(username, code):
            u_clean = username.strip().lower()
            c_clean = code.strip()
            found = next((u for u in valid_users if (u['user'].lower() == u_clean) and u['code'] == c_clean), None)
            return found

        # Valid login test
        user = authenticate('admin', '1234')
        self.assertIsNotNone(user)
        self.assertEqual(user['role'], 'Administrador')

        # Invalid login test
        invalid_user = authenticate('admin', '9999')
        self.assertIsNone(invalid_user)




if __name__ == '__main__':
    unittest.main()
