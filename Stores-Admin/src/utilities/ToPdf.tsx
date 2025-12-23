import { Table, TD, TH, TR } from '@ag-media/react-pdf-table';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        backgroundColor: '#ffffff',
        padding: 30,
        fontSize: 14,
        fontFamily: 'Helvetica',
        borderWidth: 1,
        borderColor: '#000000',
        borderStyle: 'solid',
    },
    header: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#000000',
        borderStyle: 'solid',
        borderTopWidth: 0,
        borderBottomWidth: 0,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        paddingVertical: 20,
        paddingHorizontal: 30,
    },
    headerLogo: {
        width: 200,
        // marginBottom: 10,
    },
    content: {
        backgroundColor: '#ffffff',
        borderWidth: 3,
        borderColor: '#000000',
        borderStyle: 'solid',
        borderTopWidth: 0,
        borderBottomWidth: 0,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        padding: 30,
        alignItems: 'center',
    },
    contentTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    contentText: {
        fontSize: 12,
        marginBottom: 10,
    },
    contentHr: {
        width: '100%',
        height: 1,
        backgroundColor: '#000000',
        marginTop: 20,
        marginBottom: 20,
    },
    // page: {
    //     flexDirection: 'column',
    //     justifyContent: 'flex-start',
    //     backgroundColor: '#ffffff',
    //     padding: 20,
    //     fontSize: 12,
    //     fontFamily: 'Helvetica',
    // },
    logo: {
        width: 120,
        marginBottom: 10,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 5,
        textDecoration: 'underline',
    },
    subtitle: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 15,
        textDecoration: 'underline',
    },
    // content: {
    //     lineHeight: 1.5,
    //     marginBottom: 20,
    // },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 30,
        borderStyle: 'solid',
        borderWidth: 3,
        borderColor: '#000',
        boxShadow: '5px 5px rgba(240, 46, 170, 0.4), 10px 10px rgba(240, 46, 170, 0.3), 15px 15px rgba(240, 46, 170, 0.2), 20px 20px rgba(240, 46, 170, 0.1), 25px 25px rgba(240, 46, 170, 0.05)',
    },
    signatureBlock: {
        flexDirection: 'column',
        alignItems: 'center',
    },
    signatureLine: {
        width: 120,
        height: 1,
        backgroundColor: '#000',
        marginVertical: 5,
    },
    footerText: {
        fontSize: 10,
        textAlign: 'center',
        marginTop: 5,
    },

    row: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    colNumber: {
        width: '5%',
        fontWeight: 'bold',
    },
    colLabel: {
        width: '60%',
    },
    colValue: {
        width: '35%',
    },
    // footer: {
    //     marginTop: 20,
    //     borderTopWidth: 1,
    //     borderTopColor: '#000',
    //     paddingTop: 10,
    //     flexDirection: 'row',
    //     justifyContent: 'space-between',
    // },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#000',
        borderCollapse: 'collapse',
    },
    tableRow: {
        flexDirection: 'row',
    },
    tableHeader: {
        backgroundColor: '#f0f0f0',
        fontWeight: 'bold',
        padding: 5,
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#000',
        textAlign: 'left',
        flexShrink: 1,
    },
    tableCell: {
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#000',
        padding: 5,
        flexGrow: 1,
        flexShrink: 1, // Allows cells to shrink but maintain content space
        textAlign: 'left',
        fontSize: 10,
        whiteSpace: 'nowrap', // Prevent wrapping
        minWidth: 'auto', // Dynamically adjust to content
    },
    // footer: {
    //     marginTop: 20,
    //     borderTopWidth: 1,
    //     borderTopColor: '#000',
    //     paddingTop: 10,
    //     flexDirection: 'row',
    //     justifyContent: 'space-between',
    // },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 5,
    },
    text: {
        fontSize: 10,
        marginBottom: 5,
        textAlign: 'justify',
    },
    bold: {
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 10,
    },
    subsection: {
        marginLeft: 15,
        marginBottom: 5,
    },
});

// Mock data for the table
const tableData = [
    { no: 1, member: 'Adelaide Obeng-Wiafe', spouse: 'David Abbey Mark', dep1: 'Margaret Obeng-Wiafe', dep2: 'Samuel Okyere' },
    { no: 2, member: 'Adelaide Yalartai', spouse: '', dep1: 'William Brown S.P.', dep2: 'Richard Brown Nyarko' },
    { no: 3, member: 'Adeline Addy', spouse: 'Sammy Addy Nii Okai', dep1: 'Alberta Amankwa Boatema', dep2: 'Sampson Boakye Yaw' },
    { no: 4, member: 'Akua Fosuah Oware', spouse: 'Maxwell Anokye', dep1: 'Hilary Adjei', dep2: 'Pastora Mensah' },
    { no: 5, member: 'Charles Kwasi Nana Owusu-Osei', spouse: 'Cherylene Owusu-Osei Afua Ampomah', dep1: 'Gladys Akosua Pomaa Osei', dep2: 'Suzanne Awotwi Osei' },
    // Add the rest of the rows as per the table in the image.
];

// Create Document Component
const MyDocument = () => (
    <Document>
        <Page size="A4" style={styles.page}>
            <View style={styles.header}>
                <View style={styles.content}>
                    <Image src="/assets/images/alumniImg.png" style={styles.headerLogo} />
                </View>
            </View>
            <View style={styles.content}>
                <Text style={styles.contentTitle}>CONTRACT</Text>
                <View style={styles.contentHr} />
                <Text style={styles.contentText}>GROUP FUNERAL CRITICAL ILLNESS AND TOTAL PERMANENT DISABILITY PLAN</Text>
                <View style={styles.contentHr} />

                <Text style={styles.contentText}>POLICYHOLDER: NANANOM 1985 OPTIONAL INSURANCE</Text>
                <Text style={styles.contentText}>POLICY NUMBER: GFA/030/24</Text>
                <Text style={styles.contentText}>PACKAGES SELECTED: PLATINUM</Text>
                <Text style={styles.contentText}>EFFECTIVE DATE: 5TH MARCH 2024</Text>
            </View>
        </Page>
        <Page size="A4" style={styles.page}>
            {/* Logo */}
            <Image src="/assets/images/alumniImg.png" style={styles.logo} />

            {/* Title and Subtitle */}
            <Text style={styles.title}>ENTERPRISE LIFE ASSURANCE LTD</Text>
            <Text style={styles.subtitle}>GROUP FUNERAL, CRITICAL ILLNESS, AND TOTAL PERMANENT DISABILITY POLICY</Text>

            {/* Content */}
            <Text style={styles.content}>
                Enterprise Life Assurance LTD, having received an application for a Group Funeral policy as set out in the attached schedule and policy document, hereby agrees to pay the benefits set
                out therein provided all due premiums have been received and all other conditions laid down have been met.
            </Text>
            <Text style={styles.content}>
                This policy document, together with the attached schedule and the application and any other declaration made by the policyholder, constitutes the entire contract between Enterprise
                Life Assurance LTD and the Policyholder. Representations not recorded herein shall not be of any force or effect unless reduced to writing and signed by both parties.
            </Text>
            <Text style={styles.content}>
                ENTERPRISE LIFE ASSURANCE LTD {'\n'}
                PRIVATE MAIL BAG, GENERAL POST OFFICE {'\n'}
                ACCRA {'\n\n'}
                TEL. 0302 677 074/5 {'    '} FAX 0302 677 073
            </Text>
            <Text style={styles.content}>Date: 7-March-2024</Text>

            {/* Footer - Signatures */}
            <View style={styles.footer}>
                <View style={styles.signatureBlock}>
                    <View style={styles.signatureLine} />
                    <Text style={styles.footerText}>
                        (AGM, Technical & Life Admin) {'\n'}
                        Bernard Ewusie Mensah
                    </Text>
                </View>
                <View style={styles.signatureBlock}>
                    <View style={styles.signatureLine} />
                    <Text style={styles.footerText}>
                        (GM, Operations) {'\n'}
                        Solace Odamtten-Sowah
                    </Text>
                </View>
            </View>
        </Page>

        <Page size="A4" style={styles.page}>
            {/* Logo */}
            <Image src="/assets/images/alumniImg.png" style={styles.logo} />

            {/* Title and Subtitle */}
            <Text style={styles.title}>GROUP FUNERAL, CRITICAL ILLNESS, AND TOTAL PERMANENT DISABILITY POLICY</Text>
            <Text style={styles.subtitle}>POLICY NO. GFA/030/24</Text>
            <Text style={styles.subtitle}>SCHEDULE EFFECTIVE: 5TH MARCH 2024</Text>

            {/* Content */}
            <View style={styles.content}>
                {/* Rows */}
                <View style={styles.row}>
                    <Text style={styles.colNumber}>1.</Text>
                    <Text style={styles.colLabel}>Commencement Date</Text>
                    <Text style={styles.colValue}>5th March 2024</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colNumber}>2.</Text>
                    <Text style={styles.colLabel}>Death Benefit</Text>
                    <View style={styles.colValue}>
                        <Text>Per Member - GHS 20,000.00</Text>
                        <Text>Per Spouse - GHS 20,000.00</Text>
                        <Text>Per Parent (2) - GHS 10,000.00</Text>
                    </View>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colNumber}>3.</Text>
                    <Text style={styles.colLabel}>Critical Illness</Text>
                    <Text style={styles.colValue}>GHS 10,000.00</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colNumber}>4.</Text>
                    <Text style={styles.colLabel}>Total Permanent Disability</Text>
                    <Text style={styles.colValue}>GHS 10,000.00</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colNumber}>5.</Text>
                    <Text style={styles.colLabel}>Group Name</Text>
                    <Text style={styles.colValue}>Nananom 1985 Optional Insurance</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colNumber}>6.</Text>
                    <Text style={styles.colLabel}>Eligible Member</Text>
                    <Text style={styles.colValue}>As stated on Schedule II</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colNumber}>7.</Text>
                    <Text style={styles.colLabel}>Maximum Member Entry Age</Text>
                    <Text style={styles.colValue}>70 years</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colNumber}>8.</Text>
                    <Text style={styles.colLabel}>Maximum Dependent Entry Age</Text>
                    <Text style={styles.colValue}>80 years</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colNumber}>9.</Text>
                    <Text style={styles.colLabel}>Policyholder</Text>
                    <Text style={styles.colValue}>Nananom 1985 Optional Insurance</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colNumber}>10.</Text>
                    <Text style={styles.colLabel}>Policy Review Date</Text>
                    <Text style={styles.colValue}>5th March 2025</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colNumber}>11.</Text>
                    <Text style={styles.colLabel}>Premium Payments</Text>
                    <Text style={styles.colValue}>GHS 10,080.00</Text>
                </View>
                <View>
                    <Text>Payable on or before the commencement date and thereafter the annual premium so determined and payable on or before the respective anniversary dates.</Text>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text>EL – NANANOM 1985 OPTIONAL INSURANCE CONTRACT</Text>
                <Text>5-MAR-2024</Text>
            </View>
        </Page>

        <Page size="A4" style={styles.page}>
            {/* Logo */}
            <Image src="/path-to-logo.png" style={styles.logo} />

            {/* Title and Subtitle */}
            <Text style={styles.title}>SCHEDULE II – SCHEDULE OF ELIGIBLE MEMBERS</Text>

            {/* Table */}
            <View>
                {/* Table Header */}

                <Table style={styles.table}>
                    <TH style={styles.tableHeader}>
                        <TD>No.</TD>
                        <TD>Member</TD>
                        <TD>Spouse</TD>
                        <TD>Dependant I</TD>
                        <TD>Dependant II</TD>
                    </TH>
                    {tableData.map((row, index) => (
                        <TR key={index}>
                            <TD>{row.no}</TD>
                            <TD>{row.member}</TD>
                            <TD>{row.spouse}</TD>
                            <TD>{row.dep1}</TD>
                            <TD>{row.dep2}</TD>
                        </TR>
                    ))}
                </Table>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text>EL – NANANOM 1985 OPTIONAL INSURANCE CONTRACT</Text>
                <Text>5-MAR-2024</Text>
            </View>
        </Page>
        <Page size="A4" style={styles.page}>
            {/* Logo */}
            <Image src="/path-to-logo.png" style={styles.logo} />

            {/* Title */}
            <Text style={styles.title}>ENTERPRISE LIFE ASSURANCE LTD: GROUP FUNERAL, CRITICAL ILLNESS AND TOTAL PERMANENT DISABILITY POLICY DOCUMENT</Text>

            {/* Content */}
            <Text style={styles.sectionTitle}>1. DEFINITIONS</Text>
            <Text style={styles.text}>
                The terms defined below shall bear the meanings herein assigned to them and unless inconsistent with the context, as words, and expressions importing the one gender shall include any
                other genders, words signifying the singular number shall include the plural and vice versa.
            </Text>

            <Text style={styles.text}>1.1. ENTERPRISE LIFE means ENTERPRISE Life Assurance LTD.</Text>

            <Text style={styles.text}>1.2. COMMENCEMENT DATE means the date on which the POLICY commences as set out in the SCHEDULE.</Text>

            <Text style={styles.text}>
                1.3. DEATH BENEFIT means the benefit payable on the death of a LIFE ASSURED as set out in the SCHEDULE and subject to the terms and conditions of the POLICY.
            </Text>

            <Text style={styles.text}>1.4. ELIGIBLE MEMBER means a MEMBER who has not attained the MAXIMUM ENTRY AGE as set out in the SCHEDULE at the point of inception.</Text>

            <Text style={styles.text}>1.5. GUARDIAN means an adult custodian to whom the MEMBER has been effectively entrusted.</Text>

            <Text style={styles.text}>1.6. MEMBER means a person who is an active member of the Association and is fully paid up.</Text>

            <Text style={styles.text}>1.7. ENTRY DATE means the first day on which an ELIGIBLE MEMBER becomes a LIFE ASSURED. Such date may coincide with or precede the COMMENCEMENT DATE.</Text>

            <Text style={styles.text}>1.8. LIFE ASSURED means an ELIGIBLE MEMBER in respect of whom benefits are payable in terms of the POLICY.</Text>

            <Text style={styles.text}>1.9. MAXIMUM ENTRY AGE means the maximum permissible age of any ELIGIBLE MEMBER at the date of first becoming eligible as specified in the SCHEDULE.</Text>

            <Text style={styles.text}>1.10. PARENT means biological or any adult guardian to whom the MEMBER has been effectively entrusted.</Text>

            {/* Footer */}
            <View style={styles.footer}>
                <Text>EL – NANANOM 1985 OPTIONAL INSURANCE CONTRACT</Text>
                <Text>5-MAR-2024</Text>
            </View>
        </Page>
        <Page size="A4" style={styles.page}>
            <Image src="/assets/images/alumniImg.png" style={styles.logo} />

            <View style={styles.section}>
                <Text style={styles.header}>Enterprise Life Assurance Ltd</Text>
                <Text style={styles.text}>
                    <Text style={styles.bold}>1.11. PARENT-IN-LAW</Text> means the biological parents of a legally recognized wife.
                </Text>
                <Text style={styles.text}>
                    <Text style={styles.bold}>1.12. POLICY</Text> means this POLICY contracted between ENTERPRISE LIFE and the POLICYHOLDER, together with the SCHEDULE thereto, as amended from time to
                    time.
                </Text>
                <Text style={styles.text}>
                    <Text style={styles.bold}>1.13. POLICYHOLDER</Text> means the juristic person specified as the POLICYHOLDER in the schedule.
                </Text>
                <Text style={styles.text}>
                    <Text style={styles.bold}>1.14. POLICY REVIEW DATE</Text> means the date on which the POLICY is reviewed as set out in the SCHEDULE.
                </Text>
                <Text style={styles.text}>
                    <Text style={styles.bold}>1.15. POLICY YEAR</Text> means the period from the COMMENCEMENT DATE to the POLICY REVIEW DATE and thereafter to the subsequent annual anniversaries of
                    the POLICY REVIEW DATE.
                </Text>
                <Text style={styles.text}>
                    <Text style={styles.bold}>1.16. SCHEDULE</Text> means the schedule attaching to and forming part of the POLICY as amended from time to time.
                </Text>
                <Text style={styles.text}>
                    <Text style={styles.bold}>1.17. SPOUSE</Text> means the person to whom the scheme MEMBER is legally married or with whom s/he has an agreement recognized as a marriage in
                    accordance with some law or custom and who cohabits with the member as if married.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.bold}>2. CONDITIONS FOR PROVISION OF COVER</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.bold}>2.1 Eligibility for cover</Text>
                <Text style={styles.text}>
                    <Text style={styles.bold}>2.1.1</Text> Every LIFE ASSURED is entitled to a DEATH BENEFIT under the POLICY.
                </Text>
                <Text style={styles.text}>
                    <Text style={styles.bold}>2.1.2</Text> Notwithstanding anything to the contrary contained elsewhere in the POLICY, the DEATH BENEFIT is compulsory for all ELIGIBLE MEMBERS subject
                    to the provisions of paragraph 2.4.
                </Text>
            </View>

            <Text style={styles.footer}>EL - NANANOM 1985 OPTIONAL INSURANCE CONTRACT | 5-MAR-2024</Text>
        </Page>
        <Page size="A4" style={styles.page}>
            <Image src="/assets/images/alumniImg.png" style={styles.logo} />

            <Text style={styles.header}>EL – NANANOM 1985 OPTIONAL INSURANCE CONTRACT | 5-MAR-2024</Text>

            <Text style={styles.title}>2. CONDITIONS FOR PROVISION OF COVER</Text>

            <View style={styles.section}>
                <Text style={styles.text}>2.2 Actively a Member</Text>
                <View style={styles.subsection}>
                    <Text style={styles.text}>
                        2.2.1 An active member is a MEMBER who has paid the full premium on the ENTRY DATE, failing which his ENTRY DATE shall be delayed the payment is made in full.
                    </Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.text}>2.3 Territorial Limits</Text>
                <View style={styles.subsection}>
                    <Text style={styles.text}>There are no territorial limits applicable to this policy.</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.text}>2.4 Cessation of the death benefit</Text>
                <View style={styles.subsection}>
                    <Text style={styles.text}>2.4.1 Notwithstanding any other provisions of the POLICY a LIFE ASSURED's entitlement to a DEATH BENEFIT shall cease on the earliest of:</Text>
                    <View style={styles.subsection}>
                        <Text style={styles.text}>2.4.1.1 The termination of the POLICY</Text>
                        <Text style={styles.text}>2.4.1.2 The cessation of payment of premiums.</Text>
                        <Text style={styles.text}>2.4.1.3 The LIFE ASSURED ceasing to be an ELIGIBLE MEMBER; and</Text>
                        <Text style={styles.text}>2.4.1.4 The payment of the DEATH BENEFIT upon the death of the LIFE ASSURED</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.text}>3 PAYMENT OF DEATH BENEFITS</Text>
                <View style={styles.subsection}>
                    <Text style={styles.text}>
                        3.1 The POLICYHOLDER shall provide proof of death of a LIFE ASSURED satisfactory to ENTERPRISE LIFE together with such other information as ENTERPRISE LIFE may reasonably
                        require in order to establish the validity of a claim whereupon ENTERPRISE LIFE shall pay the DEATH BENEFIT to the POLICYHOLDER.
                    </Text>
                </View>
            </View>

            <Text style={styles.header}>EL – NANANOM 1985 OPTIONAL INSURANCE CONTRACT | 5-MAR-2024</Text>
        </Page>
        <Page size="A4" style={styles.page}>
            <Image src="/assets/images/alumniImg.png" style={styles.logo} />

            <View style={styles.section}>
                <View style={styles.subsection}>
                    <Text style={styles.text}>
                        3.2 A claim application shall be notified with documents to the Association’s scheme administrator who would in turn lodge it with ENTERPRISE LIFE within three months of the
                        date of death of a LIFE ASSURED and ENTERPRISE LIFE shall thereafter process the claim without undue delay.
                    </Text>
                    <Text style={styles.text}>3.3 Documents required for the various benefits are:</Text>
                    <View style={styles.subsection}>
                        <Text style={styles.text}>
                            Death: Mortuary receipts, Obituary, Coroners Report, Medical Certificate, Medical Certificate of cause of Death or other documents to confirm the authenticity of the claim
                        </Text>
                        <Text style={styles.text}>Critical Illness: Medical Records</Text>
                        <Text style={styles.text}>Total Permanent Disability: Medical Records</Text>
                    </View>
                </View>
            </View>
            <View style={styles.section}>
                <Text style={styles.text}>4 PAYMENTS OF PREMIUMS </Text>
                <View style={styles.subsection}>
                    <Text style={styles.text}>4.1 Premiums are to be paid regularly for the duration of the policy.</Text>
                    <Text style={styles.text}>4.2 A period of grace of one calendar month shall be allowed for payment of the premiums. </Text>
                    <Text style={styles.text}>
                        4.3 If the full amount of all outstanding premiums is not received by ENTERPRISE LIFE by the expiry of the period of grace, all cover shall cease as at the last day of the
                        month for which a premium was received, unless agreed otherwise in writing by ENTERPRISE LIFE.{' '}
                    </Text>
                    <Text style={styles.text}>4.4 Members who join the scheme after the commencement of the cover will have their premiums pro-rated for the period of cover.</Text>
                </View>
            </View>

            <Text style={styles.header}>EL – NANANOM 1985 OPTIONAL INSURANCE CONTRACT | 5-MAR-2024</Text>
        </Page>
        <Page size="A4" style={styles.page}>
            <Image src="/assets/images/alumniImg.png" style={styles.logo} />

            <View style={styles.section}>
                <Text style={styles.text}>7 CRITICAL ILLNESSES / DREAD DISEASE </Text>
                <View style={styles.subsection}>
                    <Text style={styles.text}>7.1 Benefit</Text>
                    <Text style={styles.text}>
                        The benefit shall be payable if the life insured suffers one of the conditions described hereunder. The claim, with fully supportive medical and other relevant evidences, must
                        be submitted to Enterprise Life within 3 months of the injury or onset of the illness or disease. The amount payable in the event of a claim is the benefit amount specified in
                        the schedule to this policy,
                    </Text>
                    <Text style={styles.text}>
                        Where claims for two or more of the contingent events are made simultaneously, only one payment will be made. This will be the highest payment that would have been made for any
                        one of the individual claims.
                    </Text>
                </View>

                <View style={styles.subsection}>
                    <Text style={styles.text}>7.2 Definition and Conditions of Contingent Events</Text>
                    <Text style={styles.text}>The benefit shall be payable on the confirmed diagnosis meeting the specified condition definitions below, to the satisfaction of Enterprise Life.</Text>
                    <Text style={styles.text}>(a) Stroke </Text>
                    <Text style={styles.text}>Any cerebrovascular incident producing neurological sequelae including</Text>
                    <View style={styles.subsection}>
                        <Text style={styles.text}> • infarction of the brain tissue,</Text>
                        <Text style={styles.text}> • haemorrhage into the brain tissue,</Text>
                        <Text style={styles.text}> • embolisation from an extra-cranial source.</Text>
                        <Text style={styles.text}>Evidence of permanent neurological deficit correlating to the findings of radiographic investigations must be produced.</Text>
                        <Text style={styles.text}> • Transient ischaemic attacks are specially excluded.</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.header}>EL – NANANOM 1985 OPTIONAL INSURANCE CONTRACT | 5-MAR-2024</Text>
        </Page>
        <Page size="A4" style={styles.page}>
            <Image src="/assets/images/alumniImg.png" style={styles.logo} />

            <View style={styles.section}>
                <View style={styles.subsection}>
                    <Text style={styles.text}>(b) Cardiovascular Benefit Group</Text>
                    <View style={styles.subsection}>
                        <Text style={styles.text}>(i) Heart Attack</Text>
                        <Text style={styles.text}>The death of a portion of the heart muscle as a result of inadequate blood supply. The diagnosis will be based on</Text>
                        <View style={styles.subsection}>
                            <Text style={styles.text}> • a history of typical clinical symptoms including chest pain</Text>
                            <Text style={styles.text}> • with new ECG changes in keeping with heart attack and</Text>
                            <Text style={styles.text}> • elevation of specific cardiac enzymes or cardiac markers as follows:</Text>
                            <View style={styles.subsection}>
                                <Text style={styles.text}> o Troponin T greater than 1,0 ng/ml or Troponin I greater than 0,5 ng/ml;</Text>
                                <Text style={styles.text}> o CK-MB level is 2 times the normal values in the immediate phase or 4 times normal in the after-intervention phase.</Text>
                            </View>
                        </View>
                        <Text style={styles.text}>(ii) Coronary Artery Disease Requiring Surgery</Text>
                        <Text style={styles.text}>
                            The undergoing of heart surgery to correct narrowing or blockage of two or more coronary arteries with bypass grafts in persons with ischaemic heart disease but excluding
                            percutaneous coronary interventions such as balloon angioplasty or laser relief of an obstruction.
                        </Text>
                        <Text style={styles.text}>(iii) Heart Valve Replacement</Text>
                        <Text style={styles.text}>The replacement of one or more valves due to stenosis or incompetence, or combination of these conditions.</Text>
                        <Text style={styles.text}>(iv) Surgery of the Aorta</Text>
                        <Text style={styles.text}>The undergoing of surgery to correct any narrowing, dissection, or aneurysm of the thoracic or abdominal aorta.</Text>
                        <Text style={styles.text}>(v) Valvotomy</Text>
                        <Text style={styles.text}>The surgical cutting through of a heart valve to relieve obstruction caused by a stenosed valve.</Text>
                        <Text style={styles.text}>(vi) Coronary Angioplasty and Stenting</Text>
                        <Text style={styles.text}>
                            The stretching and opening up of a coronary artery by the inflation of a balloon introduced into it, or the insertion of a stent by cardiac catheterisation under X-ray
                            monitoring. Procedure was considered medically necessary by a Cardiologist. An unlimited number of procedures per person are covered.
                        </Text>
                    </View>
                </View>
            </View>

            <Text style={styles.header}>EL – NANANOM 1985 OPTIONAL INSURANCE CONTRACT | 5-MAR-2024</Text>
        </Page>
        <Page size="A4" style={styles.page}>
            <Image src="/assets/images/alumniImg.png" style={styles.logo} />

            <View style={styles.section}>
                <View style={styles.subsection}>
                    <Text style={styles.text}>(c) Cancer</Text>
                    <Text style={styles.text}>
                        The presence of a malignant tumour characterised by the uncontrolled growth and spread of malignant cells with the invasion of normal tissue. Unequivocal histological evidence
                        of invasive malignancy must be produced.
                    </Text>
                    <Text style={styles.text}>
                        This includes leukaemia (other than chronic lymphocytic leukaemia) and malignant melanoma with depths greater than 1mm on histology; but excludes non-invasive cancers in situ,
                        kaposi sarcoma, tumors in the presence of any human immunodeficiency virus and any skin cancer other than malignant melanoma.
                    </Text>
                    <View style={styles.subsection}>
                        <Text style={styles.text}>Solid cancers:</Text>
                        <Text style={styles.text}>Localised and regional cancer including lymph node(s) involvement corresponding to stage 1 or 2;</Text>
                        <Text style={styles.text}>Cancer of the blood system:</Text>
                        <Text style={styles.text}>Leukaemia (blood cell cancer) of RAI stage II or Binet stage B;</Text>
                        <Text style={styles.text}>
                            Lymphoma (solid cancers of the blood system) of Anne Arbor stage II or Low intermediate risk on International Prognostic Index, or equivalent thereof.
                        </Text>
                        <Text style={styles.text}>Brain tumour:</Text>
                        <Text style={styles.text}>WHO Grade II tumour, which has intermediate malignancy tendency to invade.</Text>
                    </View>
                    <Text style={styles.text}>Solid cancers: Where the cancer has spread to neighbouring tissues or to distant organs corresponding to stage 3 or 4:</Text>
                    <View style={styles.subsection}>
                        <Text style={styles.text}>Cancer of the blood system:</Text>
                        <Text style={styles.text}>Leukaemia (blood cell cancer) of RAI stage III or IV, or Binet stage C.</Text>
                        <Text style={styles.text}>
                            Lymphoma (solid cancers of the blood system) of Anne Arbor stage III or IV; or an International Prognostic Index of high-intermediate risk or high risk; or equivalent
                            thereof.
                        </Text>
                        <Text style={styles.text}>Brain tumour:</Text>
                        <Text style={styles.text}>WHO Grade III or IV tumour, which has high tendency to invade and spread.</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.header}>EL – NANANOM 1985 OPTIONAL INSURANCE CONTRACT | 5-MAR-2024</Text>
        </Page>
        <Page size="A4" style={styles.page}>
            <Image src="/assets/images/alumniImg.png" style={styles.logo} />

            <View style={styles.section}>
                <View style={styles.subsection}>
                    <Text style={styles.text}>(d) Paralysis</Text>
                    <Text style={styles.text}>Paralysis of one leg or one arm, resulting in the permanent loss of the use of these limbs.</Text>
                    <Text style={styles.text}>Paralysis of, either both legs or both arms, or one leg and one arm, resulting in the permanent loss of the use of these limbs.</Text>
                </View>
            </View>

            <View style={styles.section}>
                <View style={styles.subsection}>
                    <Text style={styles.text}>(e) Major Organ Transplant</Text>
                    <Text style={styles.text}>(i) Kidney Failure</Text>
                    <Text style={styles.text}>Chronic irreversible total failure of both kidneys as a result of which regular renal dialysis is instituted.</Text>
                    <Text style={styles.text}>(ii) Major Organ Transplant</Text>
                    <Text style={styles.text}>The actual undergoing, as a recipient, of a heart, lung, heart and lung, liver, pancreas, kidney, or bone marrow transplant.</Text>
                    <Text style={styles.text}>(iii) Major Burns</Text>
                    <Text style={styles.text}>Third degree burns covering at least 20% of the body surface area.</Text>
                </View>
            </View>

            <View style={styles.section}>
                <View style={styles.subsection}>
                    <Text style={styles.text}>Exclusions for Critical Illness</Text>
                    <Text style={styles.text}>No payment shall be made if the incident or illness giving rise to such claim was directly or indirectly occasioned or accelerated by:</Text>
                    <Text style={styles.text}>• self-inflicted injuries whether the life insured be of sound or unsound mind;</Text>
                    <Text style={styles.text}>• excessive use of alcohol, deliberate inhalation of gas or use of poison, narcotics or drugs;</Text>
                    <Text style={styles.text}>
                        • participation in aviation (defined to mean actual flight or any such attempted flight, or the taking off or landing of any aircraft, or collision, whether in flight or on
                        landing, or in other circumstances related to such aerial flight) other than as a fare paying passenger on any scheduled airline or on any chartered flight with an organisation
                        regularly providing chartered flights;
                    </Text>
                </View>
            </View>

            <Text style={styles.header}>EL – NANANOM 1985 OPTIONAL INSURANCE CONTRACT | 5-MAR-2024</Text>
        </Page>
        <Page size="A4" style={styles.page}>
            <Image src="/assets/images/alumniImg.png" style={styles.logo} />

            <View style={styles.section}>
                <Text style={styles.text}>
                    • engaging in diving, power boat racing, white water rafting or yachting, horse racing, motor car or motorcycle racing, speed contests or trials, mountaineering (necessitating the
                    use of ropes or guides), bungi jumping or potholing;
                </Text>
                <Text style={styles.text}>• the effects of radioactivity.</Text>
                <Text style={styles.text}>
                    • war, invasion, act of foreign enemy, hostilities (whether war be declared or not), civil war, terrorism, rebellion, revolution, military or usurped power, riot, or civil
                    commotion.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.text}>8. TOTAL PERMANENT DISABILITY BENEFIT</Text>
                <View style={styles.subsection}>
                    <Text style={styles.text}>
                        8.1. This benefit shall be payable if the Member becomes totally and permanently unable to work in any occupation which he/she is reasonably able to do given his experience,
                        education training due to an injury or illness subject to a one month deferred period from the date of disablement.
                    </Text>
                    <Text style={styles.text}>
                        8.2. In order for the member to qualify for the TPD benefit, the Member must be certified by a qualified medical practitioner duly registered by the Medical and Dental Councill
                        of Ghana to be total and permanently unfit to carry out his or her normal duties.
                    </Text>
                    <Text style={styles.text}>8.3. The benefit payable is dependent on the option selected.</Text>
                    <Text style={styles.text}>8.4. The benefit applies to the member only.</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.text}>9. GENERAL POLICY CONDITIONS</Text>
                <View style={styles.subsection}>
                    <Text style={styles.text}>
                        9.1. Stamp duty: Any stamp duty payable under the POLICY shall be paid by ENTERPRISE LIFE. In the event of termination of the POLICY at the instigation of the POLICYHOLDER
                        before the end of a POLICY YEAR, ENTERPRISE LIFE reserves the right to reclaim from the POLICYHOLDER a proportionate share of any stamp duty paid in respect of that POLICY
                        YEAR.
                    </Text>
                </View>
            </View>
        </Page>
        <Page size="A4" style={styles.page}>
            <Image src="/assets/images/alumniImg.png" style={styles.logo} />

            <View style={styles.section}>
                <View style={styles.subsection}>
                    <Text style={styles.text}>
                        9.2. Currency: All amounts payable in terms of the POLICY, either to or by ENTERPRISE LIFE, are payable in the currency of the Republic of Ghana at the registered office of
                        ENTERPRISE LIFE.
                    </Text>
                    <Text style={styles.text}>9.3. Law: Any question of law arising under the POLICY shall be decided according to the laws of the Republic of Ghana.</Text>
                    <Text style={styles.text}>
                        9.4. Discharge to Enterprise Life: Payment by ENTERPRISE LIFE to the POLICYHOLDER of any amounts due in terms of the POLICY shall be a full and final discharge of ENTERPRISE
                        LIFE's obligations in respect of such amount due.
                    </Text>
                    <Text style={styles.text}>
                        9.5. Decisions not a precedent: No waiver of rights or latitude or indulgence granted by ENTERPRISE LIFE in any instance shall create a precedent or be construed as in any way
                        altering the terms of the POLICY.
                    </Text>
                    <Text style={styles.text}>9.6. Surrender value: The POLICY shall not participate in the profits of ENTERPRISE LIFE nor shall it have any surrender value.</Text>
                    <Text style={styles.text}>
                        9.7. Disputes: In the event of any dispute arising between the parties concerning any matter relating to the POLICY the parties will endeavor to resolve such dispute. In the
                        event of not being able to do so, the matter shall be referred to arbitration in terms of the Ghana Arbitration Act, 1961, Act 38 unless otherwise agreed by the parties. The
                        cost of the arbitration shall follow the award of the arbitrator.
                    </Text>
                    <Text style={styles.text}>
                        9.8. Inspection of records: ENTERPRISE LIFE shall have the right and opportunity at all times to inspect the records of the POLICYHOLDER and/or call for auditor's certification
                        in respect of these records for any purpose relating to this POLICY.
                    </Text>
                    <Text style={styles.text}>
                        9.9. Policy Inalienable: The POLICY may not be ceded, pledged or hypothecated in any way nor shall the DEATH BENEFIT payable in terms of the POLICY be liable to attachment or
                        be capable of being sold in execution.
                    </Text>
                    <Text style={styles.text}>10. ALTERATIONS AND TERMINATION</Text>
                    <Text style={styles.text}>10.1 ENTERPRISE LIFE or the POLICYHOLDER may alter the POLICY on the giving of not</Text>
                </View>
            </View>
        </Page>
        <Page size="A4" style={styles.page}>
            <Image src="/assets/images/alumniImg.png" style={styles.logo} />

            <View style={styles.section}>
                <Text style={styles.text}>10. ALTERATIONS AND TERMINATION</Text>
                <View style={styles.subsection}>
                    <Text style={styles.text}>
                        10.2 In the event that the other party does not agree to an alteration as envisaged in paragraph 9.1 above, and if no agreement thereon can be reached by the end of the notice
                        period, then the POLICY shall terminate on the expiry of that period.
                    </Text>
                    <Text style={styles.text}>10.3 Any alteration to the POLICY shall be effected by means of an endorsement thereto signed by an authorized, official of ENTERPRISE LIFE.</Text>
                    <Text style={styles.text}>10.4 The POLICYHOLDER may, on the giving of not less than one month's written notice to ENTERPRISE LIFE, terminate the POLICY.</Text>
                    <Text style={styles.text}>10.5 ENTERPRISE LIFE may, on the giving of not less than three months' written notice to the POLICYHOLDER, terminate the POLICY.</Text>
                    <Text style={styles.text}>10.6 This section 9 of the POLICY should be read in conjunction with section 4.</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.text}>11. EXCLUSIONS</Text>
                <View style={styles.subsection}>
                    <Text style={styles.text}>The Company will not recognize any claim occasioned or accelerated by any of the following causes:</Text>
                    <Text style={styles.text}>11.1 suicide, attempted suicide or any self-inflicted injury whether the Principal Life Assured is sane or insane at the time;</Text>
                    <Text style={styles.text}>11.2 any act committed by the Principal Life Assured, which constitutes a violation of criminal law;</Text>
                    <Text style={styles.text}>
                        11.3 excessive use of alcohol, willful inhalation of gas, willful exposure to radioactivity or the willful taking of poison or drug (except as prescribed by a medical
                        practitioner);
                    </Text>
                    <Text style={styles.text}>11.4 any act of war, military action, terrorist activities, riots, strikes, civil commotion or insurrection;</Text>
                    <Text style={styles.text}>
                        11.5 active participation in mountaineering, horse riding, hunting, any speed contest other than a speed contest on foot or fighting. (except in self-defense);{' '}
                    </Text>
                </View>
            </View>
        </Page>
        <Page size="A4" style={styles.page}>
            <Image src="/assets/images/alumniImg.png" style={styles.logo} />

            <View style={styles.section}>
                <Text style={styles.text}>11. EXCLUSIONS</Text>
                <View style={styles.subsection}>
                    <Text style={styles.text}>11.6 participation in any form of aviation other than as a fare-paying passenger on a scheduled air service over an established passenger route;</Text>
                    <Text style={styles.text}>
                        11.7 military service or training in the armed forces of any country and for this purpose “military service” includes army, naval and air force service;
                    </Text>
                    <Text style={styles.text}>11.8 Military combat outside of Ghana or military action intended to influence or overthrow the ruling Ghanaian government.</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.text}>12. CONDITIONS</Text>
                <View style={styles.subsection}>
                    <Text style={styles.text}>
                        (1) The due observance and fulfillment of the Terms of this Policy in so far as they relate to anything to be done or complied with by the Insured or his Representatives and
                        the truth of the statements and answers in the Proposal shall be conditions precedent to any liability of the ENTERPRISE LIFE to make any payment under this Policy.
                    </Text>
                    <Text style={styles.text}>
                        (2) These conditions and the Schedule shall be read together as one contract and any word or expression to which a specific meaning has been attached in any part of these
                        conditions or of the Schedule shall bear such meaning wherever it may appear.
                    </Text>
                    <Text style={styles.text}>
                        (3) The POLICYHOLDER shall before any renewal of this Policy give notice to the Company of any sickness or physical defect or infirmity of his members which he has become aware
                        during the preceding Period of Insurance and of any change of name or address. All reports certificates and information required by the ENTERPRISE LIFE shall be furnished
                        without expense to the Company and shall be in such form, as the ENTERPRISE LIFE shall prescribe.
                    </Text>
                </View>
            </View>
        </Page>
    </Document>
);

export default MyDocument;
