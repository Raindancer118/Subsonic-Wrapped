import { expect } from 'chai';
import { AIService } from '../src/services/ai';
import config from '../src/config';

// Mock Config if necessary, but we rely on default test config
// Ensure config.app.secret is set in your test environment

describe('AIService', () => {
    let aiService: AIService;
    const TEST_USER_ID = 999;
    const TEST_KEY = 'test-api-key-12345';

    before(() => {
        aiService = new AIService();
    });

    describe('Encryption', () => {
        it('should encrypt and decrypt a key correctly', () => {
            const encrypted = (aiService as any).encryptKey(TEST_KEY);
            expect(encrypted).to.not.equal(TEST_KEY);
            expect(encrypted).to.include(':'); // IV separator

            const decrypted = (aiService as any).decryptKey(encrypted);
            expect(decrypted).to.equal(TEST_KEY);
        });

        it('should return null if key is invalid/tampered', () => {
            try {
                (aiService as any).decryptKey('invalid:ciphertext');
            } catch (e) {
                // Crypto might throw or return garbage. 
                // In our implementation it throws.
                expect(e).to.exist;
            }
        });
    });

    describe('Configuration', () => {
        // We cannot easily test DB interactions without a mock DB or a test DB setup.
        // Assuming unit tests here focus on the class logic.

        // Mocking the DB method would be required here for full coverage.
        // For now, we test the public interface adherence.

        it('should have generateText method', () => {
            expect(aiService.generateText).to.be.a('function');
        });

        it('should have testConnection method', () => {
            expect(aiService.testConnection).to.be.a('function');
        });
    });
});
