const validatePayment = ({ payment, activePeopleMap, campainName, validPaymentMethods }) => {
    if (!payment.AnashIdentifier) return { ...payment, reason: "מזהה אנש לא סופק" };
  
    const person = activePeopleMap.get(String(payment.AnashIdentifier));
    if (!person) return { ...payment, reason: "מזהה אנש לא קיים במערכת או לא פעיל" };
  
    if (!payment.CampainName && !campainName) return { ...payment, reason: "שם קמפיין לא סופק" };
  
    if (!payment.Amount || payment.Amount <= 0) return { ...payment, reason: "סכום התשלום לא תקין" };
  
    if (!payment.PaymentMethod || !validPaymentMethods.includes(payment.PaymentMethod)) {
      return { ...payment, reason: "אופן התשלום לא תקין" };
    }
  
    return { ...payment, CampainName: payment.CampainName || campainName, person };
  };
  