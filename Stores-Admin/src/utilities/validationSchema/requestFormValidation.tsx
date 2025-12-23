import * as Yup from 'yup';

export const validationSchema = Yup.object().shape({
  contact_name: Yup.string().required('Name is required'),
  contact_phone: Yup.string().required('Phone number is required'),
  contact_email: Yup.string().email('Invalid email').required('Email required'),
  pickup_location: Yup.string().required('Pickup location required'),
  dropoff_location: Yup.string().required('Dropoff location required'),
  itemType: Yup.string().required('Service type required'),
  item_size: Yup.string().required('Item size required'),
  preferred_date: Yup.string().required('Date required'),
  preferred_time: Yup.string().required('Time required'),
  estimatedValue: Yup.string().required('Value estimate required'),
  pickupNumberOfFloors: Yup.number()
    .when('itemType', {
      is: (itemType: string) => ['Residential Moving', 'Office Relocation'].includes(itemType),
      then: Yup.number().required('Pickup floors required').min(1, 'At least 1 floor'),
    }),
  dropoff_number_of_floors: Yup.number()
    .when('itemType', {
      is: (itemType: string) => ['Residential Moving', 'Office Relocation'].includes(itemType),
      then: Yup.number().required('Dropoff floors required').min(1, 'At least 1 floor'),
    }),
});