import {
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  Index,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Network } from '../network/network.entity';

@Entity()
export class NetworkSwap {
  @PrimaryGeneratedColumn('uuid')
  @Index({
    unique: true,
  })
  id: string;

  @OneToOne(() => Network, (network) => network.networkSwap)
  network: Network;

  @Column({
    name: 'swap_contact_address',
  })
  swapContractAddress: string;

  @Column({
    name: 'factory_contact_address',
  })
  factoryContactAddress: string;

  @Column({
    name: 'quote_contact_address',
  })
  quoteContactAddress: string;

  @Column({
    name: 'wrapped_token_address',
    // nullable: true,
  })
  wrappedTokenAddress: string;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    nullable: true,
  })
  updatedAt: Date;

  @Column({
    name: 'deleted_at',
    nullable: true,
  })
  deletedAt: Date;
}
