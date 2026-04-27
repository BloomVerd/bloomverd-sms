import { registerEnumType } from '@nestjs/graphql';

export enum LevelType {
  L100 = 'L100',
  L200 = 'L200',
  L300 = 'L300',
  L400 = 'L400',
  L500 = 'L500',
  L600 = 'L600',
}

registerEnumType(LevelType, {
  name: 'LevelType',
  description: 'Level type of entity',
});
