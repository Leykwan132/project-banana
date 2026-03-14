import { LegalWebViewScreen } from '@/components/LegalWebViewScreen';
import { PRIVACY_POLICY_URL } from '@/constants/support';

export default function PrivacyPolicyScreen() {
    return (
        <LegalWebViewScreen
            title="Privacy policy"
            url={PRIVACY_POLICY_URL}
        />
    );
}
