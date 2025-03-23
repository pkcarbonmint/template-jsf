export const userSchema = {
  id: 'user',
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
    email: { type: 'string', format: 'email' },
    address: {
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
        zip: { type: 'string' }
      },
      required: ['street', 'city', 'zip']
    }
  },
  required: ['name', 'email']
};

export const productSchema = {
  id: 'product',
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    price: { type: 'number' },
    inStock: { type: 'boolean' },
    variants: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'number' }
        }
      }
    }
  },
  required: ['id', 'name', 'price']
};

export const registrationSchema = {
  id: 'registration',
  type: 'object',
  title: 'User Registration',
  properties: {
    userType: {
      type: 'string',
      title: 'User Type',
      enum: ['individual', 'company']
    },
    firstName: { type: 'string', title: 'First Name' },
    lastName: { type: 'string', title: 'Last Name' },
    companyName: { type: 'string', title: 'Company Name' },
    vatNumber: { type: 'string', title: 'VAT Number' },
    email: { type: 'string', format: 'email', title: 'Email' },
    agreeTerms: { type: 'boolean', title: 'I agree to the terms and conditions' }
  },
  required: ['userType', 'email', 'agreeTerms'],
  if: {
    properties: { userType: { enum: ['individual'] } }
  },
  then: {
    required: ['firstName', 'lastName']
  },
  else: {
    required: ['companyName', 'vatNumber']
  }
};

export const surveySchema = {
  id: 'survey',
  type: 'object',
  title: 'Customer Survey',
  properties: {
    satisfaction: {
      type: 'number',
      title: 'Overall Satisfaction',
      minimum: 1,
      maximum: 5
    },
    hasComments: {
      type: 'boolean',
      title: 'Do you have any additional comments?'
    },
    comments: {
      type: 'string',
      title: 'Additional Comments'
    },
    wouldRecommend: {
      type: 'boolean',
      title: 'Would you recommend our service?'
    },
    recommendReason: {
      type: 'string',
      title: 'Why would you recommend us?'
    }
  },
  allOf: [
    {
      if: {
        properties: { hasComments: { const: true } }
      },
      then: {
        required: ['comments']
      }
    },
    {
      if: {
        properties: { wouldRecommend: { const: true } }
      },
      then: {
        required: ['recommendReason']
      }
    }
  ]
};

export const paymentSchema = {
  id: 'payment',
  type: 'object',
  title: 'Payment Information',
  properties: {
    paymentMethod: {
      type: 'string',
      title: 'Payment Method',
      enum: ['creditCard', 'bankTransfer', 'paypal']
    },
    creditCardNumber: {
      type: 'string',
      title: 'Credit Card Number'
    },
    expiryDate: {
      type: 'string',
      title: 'Expiry Date'
    },
    cvv: {
      type: 'string',
      title: 'CVV'
    },
    bankName: {
      type: 'string',
      title: 'Bank Name'
    },
    accountNumber: {
      type: 'string',
      title: 'Account Number'
    },
    routingNumber: {
      type: 'string',
      title: 'Routing Number'
    },
    paypalEmail: {
      type: 'string',
      title: 'PayPal Email',
      format: 'email'
    }
  },
  required: ['paymentMethod'],
  anyOf: [
    {
      properties: {
        paymentMethod: { enum: ['creditCard'] }
      },
      required: ['creditCardNumber', 'expiryDate', 'cvv']
    },
    {
      properties: {
        paymentMethod: { enum: ['bankTransfer'] }
      },
      required: ['bankName', 'accountNumber', 'routingNumber']
    },
    {
      properties: {
        paymentMethod: { enum: ['paypal'] }
      },
      required: ['paypalEmail']
    }
  ]
};

export const allSchemas = {
  user: userSchema,
  product: productSchema,
  registration: registrationSchema,
  survey: surveySchema,
  payment: paymentSchema
};
