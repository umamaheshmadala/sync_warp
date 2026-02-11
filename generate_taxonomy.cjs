const fs = require('fs');
const xlsx = require('xlsx');

// Configuration
const INPUT_FILE = 'official_gmb_categories_india.json';
const OUTPUT_FILE = 'india_google_business_profile_taxonomy.xlsx';

// Taxonomy Definitions
const TAXONOMY_MAP = {
    // Keywords -> [Level 1, Level 2]
    // Order matters: check more specific first
    'Taxi': ['Transportation', 'Taxi Service'],
    'Transport': ['Transportation', 'Transportation Service'],
    'Logistics': ['Transportation', 'Logistics'],
    'Courier': ['Transportation', 'Courier Service'],
    'Shipping': ['Transportation', 'Shipping Service'],
    'Mover': ['Home Services', 'Moving & Storage'],
    'Storage': ['Home Services', 'Moving & Storage'],
    'Parking': ['Transportation', 'Parking'],
    'Auto': ['Automotive', 'Auto Service'],
    'Car': ['Automotive', 'Car Dealer/Service'],
    'Truck': ['Automotive', 'Truck Service'],
    'Motorcycle': ['Automotive', 'Motorcycle Service'],
    'Bike': ['Automotive', 'Bicycle Shop'],
    'Boat': ['Automotive', 'Boat Dealer/Service'],
    'Petrol': ['Transportation', 'Gas Station'],
    'Gas Station': ['Transportation', 'Gas Station'],
    'Station': ['Transportation', 'Station'],
    'Airport': ['Travel & Hospitality', 'Airport'],
    'Bus': ['Transportation', 'Public Transit'],
    'Train': ['Transportation', 'Public Transit'],
    'Metro': ['Transportation', 'Public Transit'],
    'Church': ['Community & Religious', 'Religious Place'],
    'Mosque': ['Community & Religious', 'Religious Place'],
    'Temple': ['Community & Religious', 'Religious Place'],
    'Synagogue': ['Community & Religious', 'Religious Place'],
    'Gurudwara': ['Community & Religious', 'Religious Place'],
    'Religious': ['Community & Religious', 'Religious Organization'],
    'Community': ['Community & Religious', 'Community Center'],
    'Association': ['Community & Religious', 'Association'],
    'Club': ['Community & Religious', 'Club'], // Double map with Nightlife, check context
    'Library': ['Community & Religious', 'Library'],
    'School': ['Education', 'School'],
    'College': ['Education', 'College'],
    'University': ['Education', 'University'],
    'Academy': ['Education', 'Academy'],
    'Institute': ['Education', 'Institute'],
    'Training': ['Education', 'Training Center'],
    'Tutor': ['Education', 'Tutoring'],
    'Education': ['Education', 'Education Center'],
    'Park': ['Lifestyle', 'Park'],
    'Garden': ['Lifestyle', 'Park'],
    'Zoo': ['Lifestyle', 'Zoo'],
    'Stadium': ['Entertainment', 'Stadium'],
    'Museum': ['Entertainment', 'Museum'],
    'Gallery': ['Entertainment', 'Art Gallery'],
    'Cinema': ['Entertainment', 'Movie Theater'],
    'Theater': ['Entertainment', 'Theater'],
    'Casino': ['Entertainment', 'Casino'],
    'Bowling': ['Entertainment', 'Bowling Alley'],
    'Amusement': ['Entertainment', 'Amusement Park'],
    'Arcade': ['Entertainment', 'Arcade'],
    'Video': ['Entertainment', 'Video Production'],
    'Photography': ['Professional Services', 'Photography'],
    'Photographer': ['Professional Services', 'Photography'],
    'Event': ['Events & Weddings', 'Event Venue'],
    'Wedding': ['Events & Weddings', 'Wedding Service'],
    'Planner': ['Events & Weddings', 'Event Planner'],
    'Florist': ['Events & Weddings', 'Florist'],
    'Caterer': ['Food & Beverage', 'Catering'],
    'Hotel': ['Travel & Hospitality', 'Hotel'],
    'Motel': ['Travel & Hospitality', 'Hotel'],
    'Resort': ['Travel & Hospitality', 'Resort'],
    'Hostel': ['Travel & Hospitality', 'Hostel'],
    'Travel': ['Travel & Hospitality', 'Travel Agency'],
    'Tour': ['Travel & Hospitality', 'Tour Operator'],
    'Bank': ['Finance', 'Bank'],
    'ATM': ['Finance', 'ATM'],
    'Credit': ['Finance', 'Credit Union'],
    'Financial': ['Finance', 'Financial Service'],
    'Insurance': ['Finance', 'Insurance'],
    'Investment': ['Finance', 'Investment'],
    'Tax': ['Professional Services', 'Tax Service'],
    'Accountant': ['Professional Services', 'Accounting'],
    'Law': ['Professional Services', 'Legal'],
    'Lawyer': ['Professional Services', 'Legal'],
    'Attorney': ['Professional Services', 'Legal'],
    'Notary': ['Professional Services', 'Legal'],
    'Consultant': ['Professional Services', 'Consulting'],
    'Marketing': ['Professional Services', 'Marketing'],
    'Advertising': ['Professional Services', 'Advertising'],
    'Design': ['Professional Services', 'Design'],
    'Web': ['Professional Services', 'Web Design'],
    'Software': ['Professional Services', 'Software Company'],
    'Computer': ['Professional Services', 'IT Services'],
    'Employment': ['Professional Services', 'Employment Agency'],
    'Real Estate': ['Real Estate', 'Real Estate Agency'],
    'Apartment': ['Real Estate', 'Residential'],
    'Condo': ['Real Estate', 'Residential'],
    'Housing': ['Real Estate', 'Housing Complex'],
    'Property': ['Real Estate', 'Property Management'],
    'Government': ['Government & Public Services', 'Government Office'],
    'Police': ['Government & Public Services', 'Emergency Services'],
    'Fire': ['Government & Public Services', 'Emergency Services'],
    'Post': ['Government & Public Services', 'Postal Service'],
    'Embassy': ['Government & Public Services', 'Embassy'],
    'Court': ['Government & Public Services', 'Courthouse'],
    'City Hall': ['Government & Public Services', 'City Hall'],
    'Gym': ['Health & Wellness', 'Fitness Center'],
    'Fitness': ['Health & Wellness', 'Fitness Center'],
    'Yoga': ['Health & Wellness', 'Yoga Studio'],
    'Pilates': ['Health & Wellness', 'Pilates Studio'],
    'Martial Arts': ['Health & Wellness', 'Martial Arts'],
    'Spa': ['Health & Wellness', 'Spa'],
    'Massage': ['Health & Wellness', 'Massage'],
    'Salon': ['Health & Wellness', 'Salon'],
    'Barber': ['Health & Wellness', 'Barbershop'],
    'Hair': ['Health & Wellness', 'Hair Salon'],
    'Beauty': ['Health & Wellness', 'Beauty Salon'],
    'Nail': ['Health & Wellness', 'Nail Salon'],
    'Skin': ['Health & Wellness', 'Skin Care'],
    'Medical': ['Health & Wellness', 'Medical Center'],
    'Doctor': ['Health & Wellness', 'Medical Practice'],
    'Physician': ['Health & Wellness', 'Medical Practice'],
    'Clinic': ['Health & Wellness', 'Clinic'],
    'Hospital': ['Health & Wellness', 'Hospital'],
    'Dentist': ['Health & Wellness', 'Dental'],
    'Dental': ['Health & Wellness', 'Dental'],
    'Chiropractor': ['Health & Wellness', 'Chiropractor'],
    'Therapy': ['Health & Wellness', 'Therapy'],
    'Pharmacy': ['Health & Wellness', 'Pharmacy'],
    'Drugstore': ['Health & Wellness', 'Pharmacy'],
    'Veterinarian': ['Health & Wellness', 'Veterinary'],
    'Animal': ['Family & Childcare', 'Pet Services'], // Context dependent, put lower
    'Pet': ['Family & Childcare', 'Pet Services'],
    'Day Care': ['Family & Childcare', 'Child Care'],
    'Preschool': ['Education', 'Preschool'],
    'Restaurant': ['Food & Beverage', 'Restaurant'],
    'Cafe': ['Food & Beverage', 'Cafe'],
    'Coffee': ['Food & Beverage', 'Cafe'],
    'Tea': ['Food & Beverage', 'Cafe'],
    'Bakery': ['Food & Beverage', 'Bakery'],
    'Bar': ['Nightlife', 'Bar'],
    'Pub': ['Nightlife', 'Pub'],
    'Lounge': ['Nightlife', 'Lounge'],
    'Night Club': ['Nightlife', 'Night Club'],
    'Winery': ['Food & Beverage', 'Winery'],
    'Brewery': ['Food & Beverage', 'Brewery'],
    'Distillery': ['Food & Beverage', 'Distillery'],
    'Pizza': ['Food & Beverage', 'Restaurant'],
    'Burger': ['Food & Beverage', 'Restaurant'],
    'Sandwich': ['Food & Beverage', 'Restaurant'],
    'Diner': ['Food & Beverage', 'Restaurant'],
    'Steak': ['Food & Beverage', 'Restaurant'],
    'Sushi': ['Food & Beverage', 'Restaurant'],
    'Noodle': ['Food & Beverage', 'Restaurant'],
    'Buffet': ['Food & Beverage', 'Restaurant'],
    'Fast Food': ['Food & Beverage', 'Restaurant'],
    'Takeout': ['Food & Beverage', 'Restaurant'],
    'Delivery': ['Food & Beverage', 'Restaurant'],
    'Grocery': ['Retail', 'Grocery'],
    'Supermarket': ['Retail', 'Grocery'],
    'Convenience': ['Retail', 'Convenience Store'],
    'Market': ['Retail', 'Market'],
    'Store': ['Retail', 'Store'],
    'Shop': ['Retail', 'Shop'],
    'Outlet': ['Retail', 'Outlet'],
    'Mall': ['Retail', 'Shopping Mall'],
    'Boutique': ['Retail', 'Clothing'],
    'Clothing': ['Retail', 'Clothing'],
    'Shoe': ['Retail', 'Shoes'],
    'Jewelry': ['Retail', 'Jewelry'],
    'Watch': ['Retail', 'Watches'],
    'Furniture': ['Retail', 'Furniture'],
    'Home': ['Retail', 'Home Goods'],
    'Electronics': ['Retail', 'Electronics'],
    'Mobile': ['Retail', 'Mobile Phones'],
    'Computer': ['Retail', 'Computers'],
    'Book': ['Retail', 'Bookstore'],
    'Toy': ['Retail', 'Toy Store'],
    'Sport': ['Retail', 'Sporting Goods'],
    'Gift': ['Retail', 'Gift Shop'],
    'Flower': ['Retail', 'Florist'],
    'Hardware': ['Home Services', 'Hardware Store'], // Often retail, but supports services
    'Paint': ['Home Services', 'Paint Store'],
    'Garden': ['Home Services', 'Garden Center'],
    'Plumber': ['Home Services', 'Plumbing'],
    'Electrician': ['Home Services', 'Electrical'],
    'Cleaner': ['Home Services', 'Cleaning'],
    'Cleaning': ['Home Services', 'Cleaning'],
    'Laundry': ['Home Services', 'Laundry'],
    'Dry Cleaner': ['Home Services', 'Dry Cleaning'],
    'Tailor': ['Home Services', 'Tailor'],
    'Locksmith': ['Home Services', 'Locksmith'],
    'Pest': ['Home Services', 'Pest Control'],
    'Repair': ['Home Services', 'Repair'],
    'Service': ['Consumer Services', 'Service'],
};

const DEFAULT_CATEGORY = ['Consumer Services', 'General'];

function categorize(googleCategory) {
    const name = (googleCategory.displayName || '').toLowerCase();

    // Check for exact keywords in the name
    for (const [keyword, classification] of Object.entries(TAXONOMY_MAP)) {
        if (name.includes(keyword.toLowerCase())) {
            // Refine specific edge cases
            if (keyword === 'Club' && (name.includes('fitness') || name.includes('health'))) return ['Health & Wellness', 'Fitness Center'];
            if (keyword === 'Club' && (name.includes('golf') || name.includes('country'))) return ['Lifestyle', 'Club'];
            if (keyword === 'Repair' && (name.includes('auto') || name.includes('car') || name.includes('truck'))) return ['Automotive', 'Auto Repair'];
            if (keyword === 'Store' && name.includes('clothing')) return ['Retail', 'Clothing Store'];
            if (keyword === 'School' && name.includes('driving')) return ['Automotive', 'Driving School'];

            return classification;
        }
    }

    return DEFAULT_CATEGORY;
}

function processCategories() {
    console.log('Reading raw categories...');
    let rawData = [];
    try {
        const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');
        rawData = JSON.parse(fileContent);
    } catch (e) {
        console.error('Error reading input file:', e);
        return;
    }

    console.log(`Processing ${rawData.length} categories...`);

    const taxonomyData = rawData.map(item => {
        const [l1, l2] = categorize(item);

        // Extract basic attributes (service types) if available
        let attributes = [];
        if (item.serviceTypes) {
            attributes = item.serviceTypes.map(st => st.displayName);
        }

        // Simple mapping for 'india_local_equivalent' - just copying name for now as placeholder
        // or could be a translated name if available in 'displayName' object

        return {
            google_category: item.displayName,
            google_category_id: item.name, // e.g. "gcid:restaurant"
            level1_major_category: l1,
            level2_main_category: l2,
            level3_subcategory: item.displayName, // Exact Google Name per request
            level4_subsubcategory: '', // Leave blank as requested unless specialized
            attributes: attributes.join(', '),
            india_local_equivalent: item.displayName,
            source: 'GoogleAPI',
            review_flag: l1 === 'Consumer Services' ? 'Check Classification' : '' // Flag generic ones
        };
    });

    // Create Worksheet
    const ws = xlsx.utils.json_to_sheet(taxonomyData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Taxonomy');

    // Write File
    xlsx.writeFile(wb, OUTPUT_FILE);
    console.log(`Saved taxonomy to ${OUTPUT_FILE}`);
}

processCategories();
