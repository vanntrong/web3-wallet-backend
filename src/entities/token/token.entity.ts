import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Transaction } from '../transaction/transaction.entity';
import { TokenNetwork } from './tokenNetwork.entity';

@Entity()
export class Token {
  @PrimaryGeneratedColumn('uuid')
  @Index({
    unique: true,
  })
  id: string;

  @Column()
  name: string;

  @Column()
  symbol: string;

  @Column({
    type: 'int',
  })
  decimal: number;

  @Column({
    nullable: true,
  })
  thumbnail: string;

  @Column({
    nullable: true,
    name: 'price_feed_id',
  })
  priceFeedId: string;

  @Column({
    nullable: true,
    name: '24hz_percent_change',
  })
  ['24hrPercentChange']: string;

  @OneToMany(() => Transaction, (transaction) => transaction.token)
  transactions: Transaction[];

  @OneToMany(() => TokenNetwork, (tokenNetwork) => tokenNetwork.token)
  tokenNetworks: TokenNetwork[];

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    nullable: true,
  })
  updatedAt: Date;
}
