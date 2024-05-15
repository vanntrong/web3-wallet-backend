import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class UserSecret {
  @PrimaryGeneratedColumn('uuid')
  @Index({
    unique: true,
  })
  id: string;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @Column({
    name: 'private_key',
  })
  privateKey: string;

  @Column({
    name: 'public_key',
  })
  publicKey: string;

  @Column({
    name: 'mnemonic',
  })
  @Index({
    unique: true,
  })
  mnemonic: string;

  @Column({
    name: 'biometric_public_key',
    nullable: true,
  })
  biometricPublicKey: string;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;
}
