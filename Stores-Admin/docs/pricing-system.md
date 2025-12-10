# MoreVans Pricing System Documentation

## Overview

The MoreVans pricing system is a dynamic, factor-based pricing engine that calculates delivery costs based on multiple variables. The system consists of two main components:

1. Pricing Factors - Individual components that affect the final price
2. Pricing Configurations - Sets of active factors and their base settings

## Pricing Factors

### Categories

1. **Distance**

    - Base rate per kilometer
    - Minimum distance
    - Maximum distance

2. **Weight**

    - Base rate per kilogram
    - Minimum weight
    - Maximum weight

3. **Time**

    - Peak hour multiplier
    - Weekend multiplier
    - Holiday multiplier

4. **Weather**

    - Rain multiplier
    - Snow multiplier
    - Extreme weather multiplier

5. **Vehicle Type**

    - Vehicle type selection
    - Base rate
    - Capacity multiplier

6. **Special Requirements**

    - Fragile items multiplier
    - Assembly required rate
    - Special equipment rate

7. **Location**

    - City name
    - Zone multiplier
    - Congestion charge
    - Parking fee

8. **Service Level**

    - Service level selection
    - Price multiplier

9. **Staff Required**

    - Base rate per staff
    - Minimum staff
    - Maximum staff

10. **Property Type**

    - Property type selection
    - Base rate
    - Rate per room
    - Elevator discount
    - Floor rate

11. **Insurance**

    - Base rate
    - Value percentage
    - Minimum premium

12. **Loading Time**
    - Base rate per hour
    - Minimum hours
    - Overtime multiplier

## Pricing Configuration

### Components

1. **Base Settings**

    - Base price
    - Minimum price
    - Maximum price multiplier
    - Fuel surcharge percentage
    - Carbon offset rate

2. **Active Factors**
    - Selection of active factors from each category
    - Factor-specific settings

### API Endpoints

#### Pricing Factors

```typescript
// Get all pricing factors
GET /admin/pricing/factors/

// Create new pricing factor
POST /admin/pricing/factors/
{
    "name": string,
    "description": string,
    "category": string,
    "is_active": boolean,
    // Category-specific fields
}

// Update pricing factor
PUT /admin/pricing/factors/{id}/
{
    // Same as create
}

// Delete pricing factor
DELETE /admin/pricing/factors/{id}/
```

#### Pricing Configurations

```typescript
// Get all pricing configurations
GET /admin/pricing/configurations/

// Create new pricing configuration
POST /admin/pricing/configurations/
{
    "name": string,
    "is_active": boolean,
    "base_price": number,
    "min_price": number,
    "max_price_multiplier": number,
    "fuel_surcharge_percentage": number,
    "carbon_offset_rate": number,
    "active_factors": {
        "distance": number[], // Factor IDs
        "weight": number[],
        // ... other categories
    }
}

// Update pricing configuration
PUT /admin/pricing/configurations/{id}/
{
    // Same as create
}

// Delete pricing configuration
DELETE /admin/pricing/configurations/{id}/
```

## Price Calculation Flow

1. **Request Submission**

    ```typescript
    interface PriceRequest {
        estimated_distance: number;
        total_weight: number;
        service_level: string;
        property_type: string;
        number_of_rooms: number;
        floor_number: number;
        has_elevator: boolean;
        loading_time: number;
        unloading_time: number;
        vehicle_type: string;
        pickup_city: string;
        dropoff_city: string;
        request_id: number;
    }
    ```

2. **Price Calculation Steps**
   a. Apply base price from configuration
   b. Calculate distance-based pricing
   c. Apply weight-based charges
   d. Apply time-based multipliers
   e. Check weather conditions
   f. Apply vehicle type rates
   g. Add special requirements costs
   h. Apply location-specific charges
   i. Apply service level multiplier
   j. Calculate staff costs
   k. Apply property type rates
   l. Add insurance costs
   m. Calculate loading/unloading time costs
   n. Apply fuel surcharge
   o. Add carbon offset
   p. Ensure price is within min/max bounds

3. **Price Preview Response**
    ```typescript
    interface PricePreview {
        base_price: number;
        final_price: number;
        price_breakdown: {
            distance: number;
            weight: number;
            time: number;
            weather: number;
            vehicle: number;
            special_requirements: number;
            location: number;
            service_level: number;
            staff: number;
            property: number;
            insurance: number;
            loading_time: number;
            fuel_surcharge: number;
            carbon_offset: number;
        };
        best_price: {
            date: string;
            price: number;
            staff_count: number;
        };
        monthly_calendar: Array<{
            date: string;
            price: number;
            staff_options: Array<{
                count: number;
                price: number;
            }>;
        }>;
    }
    ```

## Frontend Implementation

### Components

1. **PricingFactorForm**

    - Handles creation and editing of pricing factors
    - Dynamic form fields based on factor category
    - Validation for each factor type

2. **PricingConfigurationForm**

    - Manages pricing configuration settings
    - Factor selection interface
    - Base price settings

3. **PricePreview**
    - Displays calculated prices
    - Shows price breakdown
    - Monthly calendar view
    - Staff options comparison

### State Management

```typescript
interface PricingState {
    factors: {
        [category: string]: PricingFactor[];
    };
    configurations: PricingConfiguration[];
    activeConfiguration: PricingConfiguration | null;
    loading: boolean;
    error: string | null;
}
```

## Testing the Pricing System

1. **Unit Tests**

    - Test each factor calculation independently
    - Verify price bounds and constraints
    - Test configuration validation

2. **Integration Tests**

    - Test complete price calculation flow
    - Verify API endpoints
    - Test error handling

3. **Manual Testing**
    - Test different combinations of factors
    - Verify price calculations match expectations
    - Test edge cases and boundary conditions

## Monitoring and Analytics

1. **Price Calculation Logs**

    - Log all price calculations
    - Track factor usage
    - Monitor price ranges

2. **Performance Metrics**

    - Response times
    - Calculation accuracy
    - System uptime

3. **Business Analytics**
    - Most used factors
    - Price distribution
    - Customer price sensitivity
