import bcrypt from 'bcrypt';

const generatePasswordHash = async (password: string): Promise<string> => {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
};

// Generate hashes for seed data
const generateHashes = async () => {
  console.log('Generating password hashes for seed data...\n');
  
  const passwords = [
    { label: 'admin123', password: 'admin123' },
    { label: 'student123', password: 'student123' },
  ];

  for (const { label, password } of passwords) {
    const hash = await generatePasswordHash(password);
    console.log(`${label}: ${hash}\n`);
  }
};

// Run if called directly
if (require.main === module) {
  generateHashes();
}

export default generatePasswordHash;
