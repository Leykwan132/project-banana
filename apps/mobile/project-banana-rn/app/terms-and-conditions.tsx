import { LegalWebViewScreen } from '@/components/LegalWebViewScreen';
import { TERMS_AND_CONDITIONS_URL } from '@/constants/support';

export default function TermsAndConditionsScreen() {
    return (
        <LegalWebViewScreen
            title="Terms & Conditions"
            url={TERMS_AND_CONDITIONS_URL}
        />
    );
}
