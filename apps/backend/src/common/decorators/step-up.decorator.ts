import { SetMetadata } from '@nestjs/common';

export const STEP_UP_KEY = 'requireStepUp';

export const StepUp = () => SetMetadata(STEP_UP_KEY, true);
