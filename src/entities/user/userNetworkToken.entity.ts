import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TokenNetwork } from '../token/tokenNetwork.entity';
import { User } from './user.entity';

@Entity()
export class UserNetworkToken {
  @PrimaryGeneratedColumn('uuid', {
    name: 'user_network_token_id',
  })
  userNetworkTokenId: string;

  @ManyToOne(() => User, (user) => user.userNetworkToken)
  user: User;

  @ManyToOne(
    () => TokenNetwork,
    (tokenNetwork) => tokenNetwork.userNetworkToken,
  )
  tokenNetwork: TokenNetwork;
}
