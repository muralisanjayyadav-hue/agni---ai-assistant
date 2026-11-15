import { OfflineFormulaItem } from '../types';

export const OFFLINE_FORMULAS: OfflineFormulaItem[] = [
  // Physics
  {
    id: 'phy-1',
    subject: 'Physics',
    topic: 'Kinematics & Motion',
    name: 'Equations of Motion',
    formula: 'v = u + at | s = ut + ½at² | v² = u² + 2as',
    explanation: 'Fundamental kinematic relationships for motion with constant acceleration.',
    variables: ['u = initial velocity (m/s)', 'v = final velocity (m/s)', 'a = acceleration (m/s²)', 't = time (s)', 's = displacement (m)'],
    example: 'A car starts from rest (u=0) with a = 2 m/s² for 5 s. Final velocity v = 0 + 2(5) = 10 m/s.',
  },
  {
    id: 'phy-2',
    subject: 'Physics',
    topic: 'Dynamics & Gravitation',
    name: "Newton's Second Law & Universal Gravitation",
    formula: 'F = ma | F_g = G(m₁m₂)/r²',
    explanation: 'Force is the rate of change of momentum. Gravitational attraction between two masses.',
    variables: ['F = Force (N)', 'm = mass (kg)', 'a = acceleration (m/s²)', 'G = 6.674 × 10⁻¹¹ N·m²/kg²', 'r = distance between centers (m)'],
    example: 'Weight of 50 kg student on Earth: W = mg = 50 × 9.8 = 490 N.',
  },
  {
    id: 'phy-3',
    subject: 'Physics',
    topic: 'Work, Energy & Power',
    name: 'Work-Energy Theorem & Power',
    formula: 'W = F·d·cos(θ) | KE = ½mv² | PE = mgh | P = W/t',
    explanation: 'Work done equals change in kinetic energy. Power is work per unit time.',
    variables: ['W = Work (Joules)', 'F = force', 'd = distance', 'P = Power (Watts)', 'h = height (m)'],
    example: 'Lifting 10 kg mass by 2 m: PE = 10 × 9.8 × 2 = 196 J.',
  },
  {
    id: 'phy-4',
    subject: 'Physics',
    topic: 'Current Electricity',
    name: "Ohm's Law & Electrical Power",
    formula: 'V = IR | P = VI = I²R = V²/R | R_series = R₁ + R₂ | 1/R_parallel = 1/R₁ + 1/R₂',
    explanation: 'Potential difference across a conductor is proportional to electric current at constant temperature.',
    variables: ['V = voltage (Volts)', 'I = current (Amperes)', 'R = resistance (Ohms Ω)', 'P = power (Watts)'],
    example: 'A 240V heater draws 10A current: R = V/I = 240/10 = 24 Ω. Power P = 2400 W (2.4 kW).',
  },
  {
    id: 'phy-5',
    subject: 'Physics',
    topic: 'Optics',
    name: 'Mirror Formula & Snell’s Law of Refraction',
    formula: '1/f = 1/v + 1/u | n₁ sin(θ₁) = n₂ sin(θ₂) | m = -v/u = h_i/h_o',
    explanation: 'Relates focal length f, image distance v, and object distance u in spherical mirrors and lenses.',
    variables: ['f = focal length', 'u = object distance (always negative in sign convention)', 'v = image distance', 'n = refractive index'],
    example: 'Concave mirror f = -15 cm, object at u = -30 cm: 1/v = 1/(-15) - 1/(-30) = -1/30 ⇒ v = -30 cm (real, inverted).',
  },

  // Chemistry
  {
    id: 'chem-1',
    subject: 'Chemistry',
    topic: 'Mole Concept & Stoichiometry',
    name: 'Mole Calculations & Molar Mass',
    formula: 'n = m / M = N / N_A = V / 22.4L (at STP)',
    explanation: 'Number of moles relates mass, particle count, and gas volume at standard temperature and pressure.',
    variables: ['n = moles', 'm = given mass (g)', 'M = molar mass (g/mol)', 'N_A = 6.022 × 10²³ particles', 'V = volume of gas'],
    example: 'Number of moles in 36 g of water (H₂O, M = 18 g/mol): n = 36/18 = 2 moles.',
  },
  {
    id: 'chem-2',
    subject: 'Chemistry',
    topic: 'Gas Laws',
    name: 'Ideal Gas Equation',
    formula: 'PV = nRT | (P₁V₁)/T₁ = (P₂V₂)/T₂',
    explanation: 'Describes behavior of ideal gas relating pressure, volume, temperature, and quantity.',
    variables: ['P = pressure (atm or Pa)', 'V = volume (L or m³)', 'n = moles', 'R = 0.0821 L·atm/(mol·K) or 8.314 J/(mol·K)', 'T = Temperature (Kelvin)'],
    example: '1 mole of gas at 273 K and 1 atm occupies V = (1 × 0.0821 × 273)/1 = 22.4 Litres.',
  },
  {
    id: 'chem-3',
    subject: 'Chemistry',
    topic: 'Acids, Bases & Solutions',
    name: 'pH Scale & Molarity',
    formula: 'pH = -log₁₀[H⁺] | pOH = -log₁₀[OH⁻] | pH + pOH = 14 | M = n_solute / V_solution(L)',
    explanation: 'Measure of hydrogen ion concentration and solution concentration in moles per liter.',
    variables: ['[H⁺] = hydrogen ion concentration (mol/L)', 'M = Molarity (mol/L)'],
    example: 'Solution with [H⁺] = 1 × 10⁻³ M has pH = -log(10⁻³) = 3.0 (Acidic).',
  },

  // Mathematics
  {
    id: 'math-1',
    subject: 'Mathematics',
    topic: 'Algebra & Quadratics',
    name: 'Quadratic Equation Roots & Vertex',
    formula: 'ax² + bx + c = 0 ⇒ x = (-b ± √(b² - 4ac)) / (2a) | D = b² - 4ac',
    explanation: 'Gives roots of any quadratic equation. Discriminant D determines nature: D > 0 real distinct, D = 0 equal, D < 0 complex.',
    variables: ['a, b, c = coefficients (a ≠ 0)', 'D = Discriminant'],
    example: 'For x² - 5x + 6 = 0: a=1, b=-5, c=6. x = (5 ± √(25 - 24))/2 = (5 ± 1)/2 ⇒ x = 3, 2.',
  },
  {
    id: 'math-2',
    subject: 'Mathematics',
    topic: 'Calculus - Differentiation',
    name: 'Standard Derivatives & Chain Rule',
    formula: 'd/dx(xⁿ) = n·xⁿ⁻¹ | d/dx(sin x) = cos x | d/dx(eˣ) = eˣ | d/dx[f(g(x))] = f\'(g(x))·g\'(x)',
    explanation: 'Rules for instantaneous rate of change of polynomials, trigonometric, and composite functions.',
    variables: ['x = independent variable', 'f, g = differentiable functions'],
    example: 'Derivative of sin(3x²): by chain rule, cos(3x²) · (6x) = 6x·cos(3x²).',
  },
  {
    id: 'math-3',
    subject: 'Mathematics',
    topic: 'Trigonometry',
    name: 'Pythagorean & Double Angle Identities',
    formula: 'sin²θ + cos²θ = 1 | sin(2θ) = 2sinθ cosθ | cos(2θ) = cos²θ - sin²θ = 1 - 2sin²θ',
    explanation: 'Core trigonometric relationships in unit circle geometry.',
    variables: ['θ = angle in radians or degrees'],
    example: 'If sin θ = 3/5 in Quadrant 1, cos θ = √(1 - 9/25) = 4/5. sin(2θ) = 2(3/5)(4/5) = 24/25.',
  },
];

export const OFFLINE_NCERT_SUMMARIES = [
  {
    id: 'ncert-c9-gravitation',
    grade: 'Class 9',
    subject: 'Physics',
    chapter: 'Gravitation & Floatation',
    summary:
      'Universal law of gravitation states every mass attracts every other mass. Acceleration due to gravity g = 9.8 m/s² on Earth surface (g = GM/R²). Mass is constant everywhere; weight depends on local gravity. Archimedes principle: buoyant force equals weight of fluid displaced.',
    keyPoints: [
      'G is universal constant: 6.67 × 10⁻¹¹ N m²/kg² (value discovered by Henry Cavendish).',
      'Weightlessness occurs during free fall.',
      'Relative density = Density of substance / Density of water (no unit).',
    ],
  },
  {
    id: 'ncert-c10-electricity',
    grade: 'Class 10',
    subject: 'Physics',
    chapter: 'Electricity & Heating Effects',
    summary:
      'Electric current is the rate of flow of electric charges (I = Q/t). Ohm’s law: V = IR. Resistance depends on length, cross-sectional area, and resistivity (R = ρL/A). Joule’s heating effect: H = I²Rt.',
    keyPoints: [
      'Series circuit: current is constant; total resistance R = R₁ + R₂ + R₃.',
      'Parallel circuit: potential difference is constant; 1/R = 1/R₁ + 1/R₂.',
      'Electric power P = VI = I²R = V²/R. 1 kWh = 3.6 × 10⁶ Joules (1 commercial unit).',
    ],
  },
  {
    id: 'ncert-c10-photosynthesis',
    grade: 'Class 10',
    subject: 'Biology',
    chapter: 'Life Processes - Nutrition',
    summary:
      'Photosynthesis is the synthesis of organic food (glucose) by green plants using CO₂, H₂O, sunlight, and chlorophyll. Equation: 6CO₂ + 12H₂O + Sunlight → C₆H₁₂O₆ + 6O₂ + 6H₂O. Occurs in chloroplasts containing thylakoids and stroma.',
    keyPoints: [
      'Light reaction occurs in thylakoid membranes (photolysis of water produces O₂, ATP, NADPH).',
      'Dark reaction (Calvin cycle) occurs in stroma to fix carbon into glucose.',
      'Stomata guard cells regulate gaseous exchange and transpiration.',
    ],
  },
];
