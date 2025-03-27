import { SchemaNode } from '../template-generator/lib/schema-parser';

// Custom interface for layout configuration to be used in the test
export interface LayoutConfig {
  id?: string;
  layout: string;
  order: string[];
  layoutOptions?: any;
  sections?: any[];
  tabs?: TabConfig[];
  steps?: StepConfig[];
}

// Interface for tab configuration
export interface TabConfig {
  id: string;
  title: string;
  layout: string;
  order: string[];
}

// Interface for wizard step configuration
export interface StepConfig {
  id: string;
  title: string;
  layout: string;
  order: string[];
}

// Basic layouts
export const userLayout: LayoutConfig = {
  layout: 'vertical',
  order: ['name', 'age', 'email', 'address']
};

export const productLayout: LayoutConfig = {
  layout: 'grid',
  order: ['id', 'name', 'price', 'inStock', 'variants'],
  layoutOptions: {
    columns: 2
  }
};

// Complex layout with tabs
export const registrationLayout: LayoutConfig = {
  layout: 'tabs',
  order: [],
  tabs: [
    {
      id: 'basicInfo',
      title: 'Basic Information',
      layout: 'grid',
      order: ['userType', 'firstName', 'lastName', 'companyName', 'vatNumber']
    },
    {
      id: 'contactInfo',
      title: 'Contact Information',
      layout: 'vertical',
      order: ['email', 'agreeTerms']
    }
  ]
};

// Layout with conditional visibility
export const surveyLayout: LayoutConfig = {
  layout: 'vertical',
  order: ['satisfaction', 'hasComments', 'comments', 'wouldRecommend', 'recommendReason']
};

// Complex layout with wizard steps
export const paymentLayout: LayoutConfig = {
  layout: 'wizard',
  order: [],
  steps: [
    {
      id: 'paymentMethod',
      title: 'Select Payment Method',
      layout: 'vertical',
      order: ['paymentMethod']
    },
    {
      id: 'creditCardDetails',
      title: 'Credit Card Details',
      layout: 'grid',
      order: ['creditCardNumber', 'expiryDate', 'cvv']
    },
    {
      id: 'bankDetails',
      title: 'Bank Details',
      layout: 'grid',
      order: ['bankName', 'accountNumber', 'routingNumber']
    },
    {
      id: 'paypalDetails',
      title: 'PayPal Details',
      layout: 'vertical',
      order: ['paypalEmail']
    }
  ]
};

// Export all layouts
export const allLayouts = {
  user: userLayout,
  product: productLayout,
  registration: registrationLayout,
  survey: surveyLayout,
  payment: paymentLayout
};