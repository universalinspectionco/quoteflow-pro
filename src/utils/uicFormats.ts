import type { Quotation, Settings } from '@/types'

/** Fixed UIC document wording shared by the PDF and Excel exporters. */
export const HEADING_HYDRO = 'QUOTATION FOR THE HYDRO TEST SERVICES'
export const HEADING_INSPECTION = 'QUOTATION FOR INSPECTION SERVICES'

export const defaultPdfHeading = (type: Quotation['type']): string =>
  type === 'valve' ? HEADING_HYDRO : HEADING_INSPECTION

export const DEFAULT_TERMS: string[] = [
  'All the Calibration / Inspection shall be carried out as per manufacturer specification, project requirement and Good Metallurgical practice unless otherwise indicated.',
  'All the prices for Calibration/ Inspection of Tools & Instruments are applicable only for the Type and List of Equipment mentioned in the above price list.',
  'After completion of Calibration/Inspection Services, the certificate will be issued.',
  'Repair Service: Repair and replacement of any spare parts to the instrument will be extra apart from Calibration charges.',
  'Repair Quotation: Shall be submitted upon Calibration.',
  'Quotation Validity: 30 days.',
  'Payment Terms: 30 days credit, PO/Service Agreement is mandatory for Credit Facility, All the Payment to be made against receipt of our Invoices.',
  'Payment Mode: Payment either Cash/ Cheque /transfer within 30 days from the date Of Submitted invoice',
  'We will not accept any demand for adjusting the Calibration/Inspection Service invoice dues with your existing Contract and agreements if any with Universal Inspection Co. Ltd (UIC).',
]

export const DEFAULT_IMPORTANT_NOTES: string[] = [
  "The Calibrated/Inspected Instruments/Equipment's/ Training Certificates to be verified by Client immediately after receiving from UIC. If there is any complaints or suspected defects in instruments or any corrections required in Calibration Certificates/ Inspection Certificates/ Training Certificates should be notified to UIC within a day. Based on client request, UIC will consider & do the recalibration and reissue the certificates without any additional cost.",
  'If failed to notify within a day, it is considered as there is no any defects on calibrated instruments/equipment/ certificates and not required any changes on the calibration certificates/Inspection certificates/training certificates as well as accepted by the client.',
  'The delay in notification to UIC, will be considered as new job & recalibration of equipments, charges will be applicable as usual.',
]

export const DEFAULT_SCOPE_OF_WORK: string[] = [
  'Mobilization of test equipment and personnel to site',
  'Hydrostatic testing of piping/valves per approved procedure',
  'Documentation and certification of test results',
  'Demobilization and site cleanup',
]

export const DEFAULT_CLIENT_PROVISIONS: string[] = [
  'Provide safe access to test location',
  'Supply test fluid (water) and power supply',
  'Provide isolation valves and blinds as required',
  'Designate site representative for coordination',
  'Provide valid work permits and safety clearance',
  'Ensure the equipment is cleaned and ready for testing',
  'Provide lifting facilities where required',
  'Provide calibrated pressure gauges for cross-checking',
]

export const CONFIDENTIALITY_NOTE =
  "Unless the customer had made the information publicly available, or with Agreement with the customer, all calibration results and documents created during the calibration of customer's equipment are considered proprietary information and treated as confidential. When required by law or by contractual agreement to release confidential information, Universal Inspection Co. Ltd (UIC) will inform the customer representative unless otherwise prohibited by law."

export const CLOSING_NOTE =
  'We hope that our proposal, terms, and conditions are very genuine & meeting your requirements.\nPlease issue the Purchase Order and arrange for the schedule to perform the services.'

/** Terms/notes helpers that keep user-entered text while guaranteeing the required item counts. */
export function numberedLines(value: string | undefined, defaults: string[], count: number): string[] {
  const custom = (value || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean)
  const source = custom.length > 0 ? custom : defaults
  return Array.from({ length: count }, (_, index) => source[index] || defaults[index] || '')
}

export function signatureEnabled(quote: Quotation, settings: Settings): boolean {
  return Boolean(
    settings.signature.showSignature &&
      (quote.sign || quote.signatureOption !== 'none'),
  )
}

export function signatureSource(quote: Quotation, settings: Settings): string {
  return (quote.signatureImage || settings.signature.signatureImage || '').trim()
}

export function signatureName(quote: Quotation, settings: Settings): string {
  return settings.signature.name || 'Authorized Signatory'
}

export function signatureDesignation(quote: Quotation, settings: Settings): string {
  return settings.signature.designation || ''
}

/** Excel worksheet names are limited to 31 characters and cannot contain these characters. */
export function sheetTitleFromHeading(heading: string): string {
  const cleaned = heading.replace(/[\\/?*\[\]:]/g, ' ').replace(/\s+/g, ' ').trim()
  return (cleaned || HEADING_INSPECTION).slice(0, 31)
}
