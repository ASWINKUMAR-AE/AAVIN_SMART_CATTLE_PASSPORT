import sys
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from accounts.models import User
from farmers.models import Farmer, Cow


PASSWORD = 'CattleSecure!874'

FARMER_SEEDS = [
    {
        "phone": "9842010001",
        "name": "M. Chinnasamy",
        "farmer_id_code": "FARM-MDU-101",
        "address": "14/2, East Street, Melur",
        "village": "Melur",
        "community": "Melur Taluk",
        "bank_account_name": "M Chinnasamy",
        "bank_name": "State Bank of India - Melur",
        "bank_account_number": "109283741001",
        "bank_ifsc": "SBIN0000874",
        "upi_id": "chinnasamy1@upi",
        "cows": [
            {
                "pashu_aadhaar": "106353486450",  # Flagship scanned ear tag
                "breed": "Jersey Cross",
                "milk_capacity": Decimal("13.50"),
                "name": "Lakshmi (AIC-106353)",
            },
            {
                "pashu_aadhaar": "100100100002",
                "breed": "Holstein Friesian Cross",
                "milk_capacity": Decimal("15.00"),
                "name": "Kamadhenu",
            },
        ],
    },
    {
        "phone": "9842010002",
        "name": "K. Murugan",
        "farmer_id_code": "FARM-MDU-102",
        "address": "28, Main Bazaar, Othakadai",
        "village": "Othakadai",
        "community": "Madurai East Taluk",
        "bank_account_name": "K Murugan",
        "bank_name": "Canara Bank - Othakadai",
        "bank_account_number": "109283741002",
        "bank_ifsc": "CNRB0001092",
        "upi_id": "murugan2@upi",
        "cows": [
            {
                "pashu_aadhaar": "100100100003",
                "breed": "Gir Cross",
                "milk_capacity": Decimal("11.50"),
                "name": "Gowri",
            },
        ],
    },
    {
        "phone": "9842010003",
        "name": "P. Shanmugam",
        "farmer_id_code": "FARM-MDU-103",
        "address": "7, Jallikattu Road, Alanganallur",
        "village": "Alanganallur",
        "community": "Vadipatti Taluk",
        "bank_account_name": "P Shanmugam",
        "bank_name": "Indian Overseas Bank - Alanganallur",
        "bank_account_number": "109283741003",
        "bank_ifsc": "IOBA0000284",
        "upi_id": "shanmugam3@upi",
        "cows": [
            {
                "pashu_aadhaar": "100100100004",
                "breed": "Kangayam",
                "milk_capacity": Decimal("9.00"),
                "name": "Ponni",
            },
        ],
    },
    {
        "phone": "9842010004",
        "name": "S. Ramasamy",
        "farmer_id_code": "FARM-MDU-104",
        "address": "52, Dindigul Highway, Vadipatti",
        "village": "Vadipatti",
        "community": "Vadipatti Taluk",
        "bank_account_name": "S Ramasamy",
        "bank_name": "State Bank of India - Vadipatti",
        "bank_account_number": "109283741004",
        "bank_ifsc": "SBIN0000874",
        "upi_id": "ramasamy4@upi",
        "cows": [
            {
                "pashu_aadhaar": "100100100005",
                "breed": "Jersey Cross",
                "milk_capacity": Decimal("14.00"),
                "name": "Kaveri",
            },
        ],
    },
    {
        "phone": "9842010005",
        "name": "V. Karuppasamy",
        "farmer_id_code": "FARM-MDU-105",
        "address": "19, Theni Main Road, Usilampatti",
        "village": "Usilampatti",
        "community": "Usilampatti Taluk",
        "bank_account_name": "V Karuppasamy",
        "bank_name": "Indian Bank - Usilampatti",
        "bank_account_number": "109283741005",
        "bank_ifsc": "IDIB000M021",
        "upi_id": "karuppasamy5@upi",
        "cows": [
            {
                "pashu_aadhaar": "100100100006",
                "breed": "Murrah Buffalo",
                "milk_capacity": Decimal("10.50"),
                "name": "Amirtham",
            },
        ],
    },
    {
        "phone": "9842010006",
        "name": "R. Palanivel",
        "farmer_id_code": "FARM-MDU-106",
        "address": "44, Kappalur Road, Tirumangalam",
        "village": "Tirumangalam",
        "community": "Tirumangalam Taluk",
        "bank_account_name": "R Palanivel",
        "bank_name": "Canara Bank - Tirumangalam",
        "bank_account_number": "109283741006",
        "bank_ifsc": "CNRB0001092",
        "upi_id": "palanivel6@upi",
        "cows": [
            {
                "pashu_aadhaar": "100100100007",
                "breed": "Red Sindhi Cross",
                "milk_capacity": Decimal("12.00"),
                "name": "Bhavani",
            },
        ],
    },
    {
        "phone": "9842010007",
        "name": "A. Soundararajan",
        "farmer_id_code": "FARM-MDU-107",
        "address": "31, Virudhunagar Road, Kallikudi",
        "village": "Kallikudi",
        "community": "Tirumangalam Taluk",
        "bank_account_name": "A Soundararajan",
        "bank_name": "Indian Overseas Bank - Kallikudi",
        "bank_account_number": "109283741007",
        "bank_ifsc": "IOBA0000284",
        "upi_id": "soundararajan7@upi",
        "cows": [
            {
                "pashu_aadhaar": "100100100008",
                "breed": "Holstein Friesian Cross",
                "milk_capacity": Decimal("16.50"),
                "name": "Ganga",
            },
        ],
    },
    {
        "phone": "9842010008",
        "name": "T. Muthuraman",
        "farmer_id_code": "FARM-MDU-108",
        "address": "8, Sedapatti Road, Peraiyur",
        "village": "Peraiyur",
        "community": "Peraiyur Taluk",
        "bank_account_name": "T Muthuraman",
        "bank_name": "State Bank of India - Peraiyur",
        "bank_account_number": "109283741008",
        "bank_ifsc": "SBIN0000874",
        "upi_id": "muthuraman8@upi",
        "cows": [
            {
                "pashu_aadhaar": "100100100009",
                "breed": "Jersey Cross",
                "milk_capacity": Decimal("13.00"),
                "name": "Sundari",
            },
        ],
    },
    {
        "phone": "9842010009",
        "name": "G. Dharmalingam",
        "farmer_id_code": "FARM-MDU-109",
        "address": "11, Kallupatti Road, Sedapatti",
        "village": "Sedapatti",
        "community": "Peraiyur Taluk",
        "bank_account_name": "G Dharmalingam",
        "bank_name": "Indian Bank - Sedapatti",
        "bank_account_number": "109283741009",
        "bank_ifsc": "IDIB000M021",
        "upi_id": "dharmalingam9@upi",
        "cows": [
            {
                "pashu_aadhaar": "100100100010",
                "breed": "Gir Cross",
                "milk_capacity": Decimal("11.00"),
                "name": "Malliga",
            },
        ],
    },
    {
        "phone": "9842010010",
        "name": "M. Manikandan",
        "farmer_id_code": "FARM-MDU-110",
        "address": "65, Singampunari Road, Kottampatti",
        "village": "Kottampatti",
        "community": "Melur Taluk",
        "bank_account_name": "M Manikandan",
        "bank_name": "Canara Bank - Kottampatti",
        "bank_account_number": "109283741010",
        "bank_ifsc": "CNRB0001092",
        "upi_id": "manikandan10@upi",
        "cows": [
            {
                "pashu_aadhaar": "100100100011",
                "breed": "Kangayam",
                "milk_capacity": Decimal("8.50"),
                "name": "Thangam",
            },
            {
                "pashu_aadhaar": "100100100012",
                "breed": "Jersey Cross",
                "milk_capacity": Decimal("14.50"),
                "name": "Senthamarai",
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seeds 10 complete Farmer accounts with personal details, bank data, and registered Cows into the database."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding Union, BMC, Society, 10 Farmers, and Cows..."))

        with transaction.atomic():
            # 1. Ensure Union
            union, created = User.objects.get_or_create(
                phone="9842000001",
                defaults={
                    "full_name": "Aavin Madurai District Co-operative Milk Producers' Union Ltd.",
                    "role": User.Role.UNION,
                    "is_staff": True,
                    "is_superuser": True,
                }
            )
            if created:
                union.set_password(PASSWORD)
                union.save()

            # 2. Ensure BMC
            bmc, created = User.objects.get_or_create(
                phone="9842000002",
                defaults={
                    "full_name": "Melur Central Bulk Milk Cooling Centre",
                    "role": User.Role.BMC,
                    "parent": union,
                }
            )
            if created:
                bmc.set_password(PASSWORD)
                bmc.save()

            # 3. Ensure Society
            society, created = User.objects.get_or_create(
                phone="9842000003",
                defaults={
                    "full_name": "Melur Primary Milk Producers Cooperative Society",
                    "role": User.Role.SOCIETY,
                    "parent": bmc,
                }
            )
            if created:
                society.set_password(PASSWORD)
                society.save()

            total_farmers = 0
            total_cows = 0

            # 4. Create 10 Farmers and their Cows
            for data in FARMER_SEEDS:
                farmer_user, u_created = User.objects.get_or_create(
                    phone=data["phone"],
                    defaults={
                        "full_name": data["name"],
                        "role": User.Role.FARMER,
                        "parent": society,
                    }
                )
                if u_created:
                    farmer_user.set_password(PASSWORD)
                    farmer_user.save()

                # Update farmer profile details
                farmer_profile = farmer_user.farmer
                farmer_profile.farmer_id_code = data["farmer_id_code"]
                farmer_profile.address = data["address"]
                farmer_profile.village = data["village"]
                farmer_profile.community = data["community"]
                farmer_profile.bank_account_name = data["bank_account_name"]
                farmer_profile.bank_name = data["bank_name"]
                farmer_profile.bank_account_number = data["bank_account_number"]
                farmer_profile.bank_ifsc = data["bank_ifsc"]
                farmer_profile.upi_id = data["upi_id"]
                farmer_profile.verification_status = "verified"
                farmer_profile.has_personal_details = True
                farmer_profile.number_of_cows = len(data["cows"])
                farmer_profile.save()

                total_farmers += 1

                # Create or update cows
                for cow_data in data["cows"]:
                    cow, c_created = Cow.objects.get_or_create(
                        pashu_aadhaar=cow_data["pashu_aadhaar"],
                        defaults={
                            "farmer": farmer_profile,
                            "breed": cow_data["breed"],
                            "milk_capacity": cow_data["milk_capacity"],
                            "name": cow_data["name"],
                        }
                    )
                    if not c_created:
                        cow.farmer = farmer_profile
                        cow.breed = cow_data["breed"]
                        cow.milk_capacity = cow_data["milk_capacity"]
                        cow.name = cow_data["name"]
                        cow.save()

                    total_cows += 1

        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded {total_farmers} Farmers and {total_cows} Cows in the database."
        ))
        self.stdout.write(self.style.SUCCESS(
            "Flagship scanned tag #106353486450 is registered to Farmer M. Chinnasamy (FARM-MDU-101)."
        ))
