import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Network } from '../network/network.entity';
import { UserNetworkToken } from '../user/userNetworkToken.entity';
import { Token } from './token.entity';

@Entity()
export class TokenNetwork {
  @PrimaryGeneratedColumn('uuid', {
    name: 'token_network_id',
  })
  tokenNetworkId: string;

  // @Column('uuid')
  // @Index()
  // public tokenId: string;

  // @Column('uuid')
  // @Index()
  // public networkId: string;

  @Column({
    name: 'contract_address',
  })
  contractAddress: string;

  @OneToMany(
    () => UserNetworkToken,
    (userNetworkToken) => userNetworkToken.tokenNetwork,
  )
  userNetworkToken: UserNetworkToken;

  @ManyToOne(() => Token, (token) => token.tokenNetworks)
  public token: Token;

  @ManyToOne(() => Network, (network) => network.tokenNetworks)
  public network: Network;
}
