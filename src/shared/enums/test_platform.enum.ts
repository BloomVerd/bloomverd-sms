import { registerEnumType } from '@nestjs/graphql';

export enum TestPlatform {
  APP = 'app',
  WEB = 'web',
}

registerEnumType(TestPlatform, {
  name: 'TestPlatform',
  description: 'Platform on which a test can be taken',
});
