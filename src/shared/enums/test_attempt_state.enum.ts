import { registerEnumType } from '@nestjs/graphql';

export enum TestAttemptState {
  NOT_STARTED = 'not_started',
  ON_GOING = 'on_going',
  ENDED = 'ended',
}

registerEnumType(TestAttemptState, {
  name: 'TestAttemptState',
  description: 'State of a student test attempt',
});
