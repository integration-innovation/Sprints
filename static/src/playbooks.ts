export type SprintPlaybook = {
  id: string;
  title: string;
  concern: string;
  vaf: string;
  gateway: string;
  outcome: string;
  prompt: string;
  starterTarget: string;
  tools: string[];
  methods: string[];
  phases: string[];
  hosts: string[];
  safeData: string;
  avoid: string;
  done: string[];
  followOn: string;
};

export const SPRINT_PLAYBOOKS: SprintPlaybook[] = [
  {
    id: "scope",
    title: "Scope & information requirements builder",
    concern: "Project definition and scope control",
    vaf: "Pre-Design · Brief Preparation · Appointments · Communication Protocol · Technical Requirements",
    gateway: "CORENET X applicability and submission-readiness planning",
    outcome: "A reusable scope, responsibility, information and sensitivity brief.",
    prompt: "Using a fictional project profile, identify the architect's core, additional and specialist services; consultant and QP responsibilities; anticipated CORENET X gateways; IFC+SG information needs; exclusions; decisions; and privacy constraints. Produce a reviewable brief, not contractual or regulatory advice.",
    starterTarget: "Create one structured project-start brief covering scope, responsibilities, gateway applicability and information sensitivity so that the team can review assumptions before design begins.",
    tools: ["Spreadsheet", "Form builder", "AI assistant", "Markdown/PDF generator"],
    methods: ["VAF service mapping", "RACI", "information classification", "assumption and exclusion log"],
    phases: ["Select fictional typology", "Map services", "Assign roles", "Classify information", "Generate and review brief"],
    hosts: ["Google Sheet: structured register", "Private GitHub: templates/versioning", "Firm DMS: approved appointment records"],
    safeData: "Fictional project code, typology, approximate GFA, generic roles and public requirements.",
    avoid: "Client identity, site address, fees, appointment terms, staff rates and confidential project documents.",
    done: ["Scope and exclusions visible", "Every output has an owner", "Gateway assumptions recorded", "Sensitivity class assigned"],
    followOn: "Test the same template on three typologies, then add firm-approved clauses and effort benchmarks in a private deployment.",
  },
  {
    id: "options",
    title: "Design option & planning dashboard",
    concern: "Design visualisation and optimisation",
    vaf: "Concept–Schematic · Design Development · Budget/Timeline Estimation · Value Engineering",
    gateway: "Evidence preparation ahead of Design Gateway",
    outcome: "A transparent comparison of design options and trade-offs.",
    prompt: "Compare three synthetic design options against five stated criteria such as GFA, circulation, daylight proxy, embodied-carbon proxy and programme. Show inputs, weights, uncertainty and trade-offs. Recommend a review direction while keeping the final design decision with the architect and client.",
    starterTarget: "Build a comparison of three synthetic design options against five weighted criteria so that the design team can explain one recommendation and its trade-offs.",
    tools: ["HTML dashboard", "Spreadsheet", "Python/JavaScript", "SVG or synthetic diagrams"],
    methods: ["multi-criteria decision analysis", "sensitivity test", "option matrix", "decision log"],
    phases: ["Define criteria", "Generate safe options", "Score evidence", "Test weight changes", "Publish decision note"],
    hosts: ["GitHub Pages: synthetic dashboard", "Google Sheet: option metrics", "Firm CDE: real design evidence"],
    safeData: "Generated geometry, rounded metrics and fictional site/programme assumptions.",
    avoid: "Actual drawings, precise site constraints, client priorities, unpublished renders and cost plans.",
    done: ["Three options comparable", "Weights editable", "Assumptions visible", "Recommendation changes can be explained"],
    followOn: "Connect approved exports from one authoring tool, then validate results against an architect's manual assessment.",
  },
  {
    id: "ifcsg",
    title: "IFC+SG readiness checker",
    concern: "Compliance checking",
    vaf: "Compliance & Liabilities · BIM · Authority/Consultant Coordination",
    gateway: "Design Gateway and Construction Gateway · IFC4 Reference View + IFC+SG",
    outcome: "A traceable pre-submission model-information quality report.",
    prompt: "Using a synthetic IFC model and a small, cited subset of the current IFC+SG Mapping File, check entity type, classification, required SGPset/property and controlled value. Separate machine checks from QP review and report pass, fail, not applicable and needs review without claiming authority validation.",
    starterTarget: "Check five cited IFC+SG information requirements for one synthetic element type so that a versioned readiness report shows pass, fail and needs-review results.",
    tools: ["IfcOpenShell or web-ifc", "IDS", "IFC+SG Mapping File", "Local-first web app"],
    methods: ["rules-as-data", "schema validation", "test fixtures", "source/version traceability"],
    phases: ["Choose element type", "Cite five rules", "Create test fixtures", "Run checks", "Review false positives"],
    hosts: ["Browser/local machine: model processing", "Private GitHub: rules and tests", "Google Sheet: findings only"],
    safeData: "Synthetic IFC, generated GUIDs and public regulatory mapping definitions.",
    avoid: "Live submission models, site coordinates, owner data, security-sensitive spaces and uncited compliance claims.",
    done: ["Rule source/version shown", "Synthetic pass/fail fixtures work", "No model upload required", "QP-review boundary displayed"],
    followOn: "Expand one element class at a time and regression-test every mapping-file update before firm use.",
  },
  {
    id: "coordination",
    title: "Prioritised BCF coordination hub",
    concern: "Prioritised coordination and change management",
    vaf: "Schematic/Detail/Tender/Construction Coordination · Deconfliction · Timeline Updates",
    gateway: "Coordinated model readiness before Design and Construction Gateways",
    outcome: "A ranked, accountable issue and design-decision workflow.",
    prompt: "Import ten synthetic BCF-style issues, classify each by discipline and type, and rank them using declared safety, compliance, dependency, programme and decision-date criteria. Link issues to synthetic IFC GUIDs and produce a must-resolve-before-gateway view.",
    starterTarget: "Prioritise ten synthetic coordination issues using five transparent impact criteria so that the team can identify what must be resolved before the next gateway.",
    tools: ["BCF-XML/BCF API", "Issue dashboard", "IFC viewer", "Rules or lightweight AI classification"],
    methods: ["impact × urgency scoring", "dependency mapping", "BCF round-trip", "decision/change log"],
    phases: ["Import issues", "Classify", "Score", "Assign and review", "Export BCF/report"],
    hosts: ["Google Sheet: issue summary", "BCF server/CDE: governed issues", "Private GitHub: synthetic test data"],
    safeData: "Synthetic viewpoints, generic issue descriptions and generated model identifiers.",
    avoid: "Real screenshots, model fragments, names, confidential coordination notes and security-related viewpoints.",
    done: ["Scoring explainable", "Owner and due date present", "Gateway blockers filtered", "BCF export round-trips"],
    followOn: "Pilot with de-identified closed issues, calibrate ranking with coordinators, then connect an approved BCF service.",
  },
  {
    id: "contract",
    title: "Contract & change control assistant",
    concern: "Contract administration",
    vaf: "Tender · Construction Contract Administration · RFI/RFA · Instructions · Variations · EOT · Certification",
    gateway: "Construction and pre-TOP delivery controls",
    outcome: "A governed register of actions, evidence, deadlines and potential consequences.",
    prompt: "Using fictional correspondence, classify five items as RFI, RFA, instruction, proposed change or record; identify owner, due date, required evidence and possible time/cost relevance. Draft neutral follow-up actions while reserving all certification, entitlement and liability decisions for authorised professionals.",
    starterTarget: "Turn five fictional correspondence items into a prioritised action and change register so that overdue decisions and missing evidence are visible without making contractual determinations.",
    tools: ["Register/dashboard", "Email export parser with synthetic mail", "Rules engine", "Report generator"],
    methods: ["controlled vocabulary", "four-eyes review", "audit trail", "deadline and ageing analysis"],
    phases: ["Ingest safe samples", "Classify", "Extract actions", "Professional review", "Issue report"],
    hosts: ["Firm DMS/CDE: source records", "Google Sheet: non-sensitive status", "Private GitHub: workflow code only"],
    safeData: "Invented parties, dates, amounts, events and correspondence.",
    avoid: "Real contracts, claims, fees, correspondence, signatures, legal advice and autonomous certification.",
    done: ["Source trace retained", "Actions and deadlines visible", "Human approval required", "No legal conclusion generated"],
    followOn: "Configure one approved contract form privately and compare outputs with an experienced contract administrator.",
  },
  {
    id: "handover",
    title: "Digital handover & asset validator",
    concern: "Digital asset management",
    vaf: "As-Built Verification · Substantial Completion · Handover · DLP · O&M Review",
    gateway: "Completion Gateway and updated as-built IFC+SG information",
    outcome: "A completeness and quality dashboard for handover information.",
    prompt: "Validate 25 synthetic maintainable assets for identifier, type, location, classification, manufacturer placeholder, installation/warranty dates, document references, commissioning and defect status. Report missing and inconsistent information and create an open CSV/JSON handover package.",
    starterTarget: "Validate 25 synthetic asset records against ten handover fields so that missing information and responsible follow-up actions appear in a completion dashboard.",
    tools: ["CSV/JSON validator", "IFC property reader", "Dashboard", "Document-link checker"],
    methods: ["information acceptance criteria", "completeness scoring", "duplicate detection", "handover gate review"],
    phases: ["Define acceptance fields", "Generate assets", "Validate", "Assign gaps", "Export handover pack"],
    hosts: ["Google Sheet: synthetic asset register", "Firm CDE: approved documents", "Asset platform: accepted operational data"],
    safeData: "Synthetic assets, generic locations, placeholder suppliers and dummy document links.",
    avoid: "Real serial numbers, warranties, access/security systems, personal contacts and unapproved as-built records.",
    done: ["Acceptance rules explicit", "25 records checked", "Gaps assigned", "Open export produced"],
    followOn: "Map the schema to one client requirement set and test a controlled handover into an approved asset platform.",
  },
];
